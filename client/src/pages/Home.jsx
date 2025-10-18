import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) return resolve(true);
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Home() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [publicKey, setPublicKey] = useState("");
  const [upiOrderId, setUpiOrderId] = useState(null);
  const [txnId, setTxnId] = useState("");
  const navigate = useNavigate();

  const isMobile = useMemo(() => {
    return /Mobi|Android/i.test(navigator.userAgent);
  }, []);

  async function fetchOrders() {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
  }

  useEffect(() => {
    fetch("/api/config/public-key")
      .then((r) => r.json())
      .then((d) => setPublicKey(d.keyId || ""));
    fetchOrders();
    // If user returned from UPI app, check for pending UPI order
    const pending = localStorage.getItem("upi_order");
    if (pending) setUpiOrderId(pending);
  }, []);

  async function handleBookNow(e) {
    e.preventDefault();
    if (!name || !mobile) return alert("Please enter name and mobile");
    setLoading(true);
    try {
      const initRes = await fetch("/api/orders/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile }),
      });
      const initData = await initRes.json();
      if (!initRes.ok)
        throw new Error(initData.error || "Failed to init order");

      const { orderId, razorpayOrderId, amount, currency } = initData;

      await loadRazorpayScript();

      // Razorpay options
      const options = {
        key: publicKey,
        amount,
        currency,
        name: "₹1 Product",
        description: "Demo purchase",
        order_id: razorpayOrderId,
        prefill: { name, contact: mobile },
        notes: { app_order_id: orderId },
        // Prefer UPI on mobile devices; Razorpay will show UPI option first where possible.
        method: isMobile ? { upi: true } : undefined,
        handler: async function (response) {
          // On success from Razorpay, verify server-side then go to status.
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              alert(verifyData.error || "Verification failed");
              setLoading(false);
              return;
            }
            setLoading(false);
            navigate(`/status/${verifyData.id}`);
          } catch (err) {
            console.error("Verification error", err);
            alert("Verification failed");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            // User dismissed the checkout (cancelled). Do not navigate to status.
            setLoading(false);
            // Optionally let the user retry; do nothing else.
          },
        },
        theme: { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);

      if (isMobile) {
        // Try direct UPI intent endpoint first (only works if MERCHANT_VPA configured).
        // If server responds that it's not configured, fall back to Razorpay checkout so
        // the user still sees UPI/PhonePe options.
        try {
          const upiRes = await fetch('/api/upi/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, mobile }),
          });
          const upiData = await upiRes.json();
          if (!upiRes.ok) {
            // fallback to Razorpay Checkout
            console.warn('UPI intent unavailable, falling back to Razorpay checkout', upiData.error);
            rzp.open();
            return;
          }
          const { phonepeUri, upiUri, orderId: newOrderId } = upiData;
          // store pending UPI order so user can confirm after returning
          localStorage.setItem('upi_order', newOrderId);
          setUpiOrderId(newOrderId);
          // Try opening PhonePe-specific URI first, fallback to upi URI
          try { window.location.href = phonepeUri || upiUri; } catch (err) { console.error('Failed to open UPI app', err); }
        } catch (err) {
          console.error('UPI intent failed — opening Razorpay checkout', err);
          rzp.open();
        }
      } else {
        rzp.open();
      }
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header>
        <h1>₹1 Demo Shop</h1>
        <div className="muted">
          Pay securely with Razorpay. On mobile, you may be redirected to
          PhonePe.
        </div>
      </header>

      <section>
        <h2>Product Buy</h2>
        <form onSubmit={handleBookNow}>
          <div className="row">
            <div>
              <label>Your Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label>Mobile Number</label>
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter mobile number"
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <div>
              <strong>₹1</strong> <span className="muted">• ₹1 Product</span>
            </div>
            <button type="submit" disabled={loading || !publicKey}>
              Book Now
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2>Previous Orders</h2>
        {orders.length === 0 && <div className="muted">No orders yet.</div>}
        {orders.map((o) => (
          <div className="order" key={o._id}>
            <div>
              <strong>{o.name}</strong> • {o.mobile}
            </div>
            <div className="muted">
              {o.product} • ₹{(o.amount / 100).toFixed(2)} •{" "}
              {new Date(o.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </section>

      {upiOrderId && (
        <section>
          <h2>Confirm UPI Payment</h2>
          <div className="muted">
            We opened your UPI app. After payment, paste the UPI transaction ID
            below to confirm (example: UPI123456789).
          </div>
          <div style={{ marginTop: 8 }}>
            <input
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="Enter UPI txn id"
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={async () => {
                if (!txnId) return alert("Enter txn id");
                setLoading(true);
                try {
                  const res = await fetch("/api/upi/confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: upiOrderId, txnId }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Confirm failed");
                  localStorage.removeItem("upi_order");
                  setUpiOrderId(null);
                  setTxnId("");
                  setLoading(false);
                  navigate(`/status/${data.id}`);
                } catch (err) {
                  console.error(err);
                  alert(err.message || "Confirm failed");
                  setLoading(false);
                }
              }}
            >
              Confirm UPI Payment
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

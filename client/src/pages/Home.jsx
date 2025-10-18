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
        handler: async function (response) {
          // Desktop inline success: verify on server then go to status
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
          if (!verifyRes.ok)
            return alert(verifyData.error || "Verification failed");
          navigate(`/status/${verifyData.id}`);
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        theme: { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);

      // For mobile, use UPI intent/PhonePe redirect; Razorpay will redirect to callback URL after
      if (isMobile) {
        // Create a custom form submit to Razorpay Checkout so it can redirect to PhonePe/UPI
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://api.razorpay.com/v1/checkout/embedded";
        const fields = {
          key_id: publicKey,
          order_id: razorpayOrderId,
          name: "₹1 Product",
          description: "Demo purchase",
          prefill: JSON.stringify({ name, contact: mobile }),
          callback_url: "/api/payments/callback",
          notes: JSON.stringify({ orderId }),
        };
        Object.entries(fields).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        rzp.open();
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
    </div>
  );
}

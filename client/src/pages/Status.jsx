import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Status() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function run() {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setOrder(data);
    }
    run();
  }, [id]);

  return (
    <div className="container">
      <h1>Payment Status</h1>
      {!order && <div>Loading...</div>}
      {order && (
        <section>
          <h2>Booking Details</h2>
          <div>
            <strong>Name:</strong> {order.name}
          </div>
          <div>
            <strong>Mobile:</strong> {order.mobile}
          </div>
          <div>
            <strong>Product:</strong> {order.product}
          </div>
          <div>
            <strong>Amount:</strong> ₹{(order.amount / 100).toFixed(2)}
          </div>
          <div>
            <strong>Order Time:</strong>{" "}
            {new Date(order.createdAt).toLocaleString()}
          </div>
          <div>
            <strong>Status:</strong> {order.status}
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => navigate("/")}>Go to Home Page</button>
          </div>
        </section>
      )}
    </div>
  );
}

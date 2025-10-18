# Single-Page React E‑commerce (₹1 Demo) with Razorpay + MongoDB

This is a minimal end-to-end example:

- Home page: Buy a ₹1 product after entering name and mobile, and view Previous Orders
- Razorpay Checkout: Desktop opens inline; Mobile redirects to PhonePe/UPI via intent
- Status page: Shows booking details after successful payment
- MongoDB: Stores orders and payment status

## Environment variables (server/.env)

Create `server/.env` with the following keys:

- RAZORPAY*KEY_ID=rzp_live*...
- RAZORPAY_KEY_SECRET=tqT...
- MONGO_URL=...
- PORT=5000 (optional)
- CLIENT_URL=http://localhost:5173 (for local dev CORS)

Never commit real secrets to version control.

## Quick start

1. Install dependencies
2. Start the server, then the client

See commands at the end of this file.

## Project structure

- server: Node/Express API with Razorpay + Mongoose
- client: React (Vite) SPA

## API overview

- POST /api/orders/init — Create a new order and Razorpay order
- POST /api/payments/verify — Verify signature (desktop inline flow)
- POST /api/payments/callback — Verify and redirect to /status/:id (mobile redirect flow)
- GET /api/orders — List paid orders
- GET /api/orders/:id — Get order by DB id
- GET /api/config/public-key — Public Razorpay key

## Try it locally

- Start MongoDB (local or Atlas)
- Configure server/.env
- Run server, then client

### Optional production notes

- Use HTTPS in production for Razorpay
- Configure allowed origins in CORS
- Set proper webhook for robust reconciliation (not included by default)

## Commands

Server

```bash
cd "server"
npm install
npm run dev
```

Client

```bash
cd "client"
npm install
npm run dev
```

Open the client URL printed by Vite (default http://localhost:5173).

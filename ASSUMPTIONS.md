# Assumptions & Architectural Trade-offs

This document outlines the core assumptions, design choices, and deliberate simplifications made for the Meta Lead Ads Live Sync Proof of Concept.

---

## 1. Meta Lead Ad Webhook Behavior

* **Metadata-Only Webhooks**:
  Meta's webhook architecture dispatches lightweight notifications containing metadata:
  ```json
  {
    "leadgen_id": "<LEADGEN_ID>",
    "page_id": "<PAGE_ID>",
    "form_id": "<FORM_ID>",
    "created_time": 1720000000
  }
  ```
* **Graph API Access vs. Sandbox Mode**:
  * In a production Meta app, retrieving customer-entered fields requires calling Meta's Graph API:
    `GET https://graph.facebook.com/v19.0/{leadgen_id}?access_token={PAGE_ACCESS_TOKEN}`
  * For this PoC: If `PAGE_ACCESS_TOKEN` is provided in `.env`, the server attempts to fetch full fields. If not provided (or when running in sandbox/testing mode), fallback attributes tied to the `leadgen_id` are populated to ensure zero runtime blockers during testing.
* **Webhook Verification Handshake**:
  Meta requires the endpoint to respond to a `GET /webhook` request echoing back `hub.challenge` when `hub.verify_token` matches.

---

## 2. Ingress & Tunneling (ngrok)

* Meta's servers require a publicly accessible HTTPS endpoint to dispatch webhook notifications.
* For local development, **ngrok** (`ngrok http 5000`) forwards requests from Meta directly to the local Express server.

---

## 3. Real-Time Delivery (Socket.IO vs Polling)

* **Choice**: WebSocket / Socket.IO
* **Rationale**:
  * The requirement specifies that the submitted lead appears live in an already-open screen without manual refresh or device interaction.
  * HTTP polling introduces periodic latency (e.g., 3-5 seconds delay) and server overhead.
  * Socket.IO enables immediate event dispatching (`io.emit('new_lead')`) the moment Meta's webhook arrives.

---

## 4. In-Memory Storage for PoC Simplicity

* **Choice**: In-memory storage array on the server
* **Rationale**:
  * Eliminating database dependencies (MongoDB, Docker, etc.) ensures zero-friction startup for anyone reviewing the repository.
  * `GET /api/leads` hydrates existing leads upon app launch, while `new_lead` socket events provide real-time updates.
  * In a production environment, this would be backed by persistent storage (PostgreSQL/MongoDB) and a message broker (Redis Pub/Sub) for horizontal scaling.

---

## 5. Scope Boundaries

* **No Authentication / Authorization**: Direct access to the live leads feed.
* **Minimal State Management**: Standard React `useState` and `useEffect` hooks manage the list cleanly without external state libraries.
* **Focused UI**: Clean Native FlatList interface displaying incoming lead details.

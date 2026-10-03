# Meta Lead Ads - Real-Time Sync PoC

A lightweight Proof of Concept demonstrating real-time synchronization between Meta Lead Ads (Webhooks) and an already-open React Native application screen using Node.js, Express, and Socket.IO.

When a lead form is submitted via Meta's Lead Testing Tool, the incoming lead appears live in the mobile app without requiring manual refresh or user interaction.

---

## Deliverables

- **Loom Video Walkthrough**: [Link to Loom Video]
- **GitHub Repository**: https://github.com/yogeshatwork04-cyber/PoC_Meta_Lead_Sync
- **Technical Assumptions & Trade-offs**: Documented in [ASSUMPTIONS.md](./ASSUMPTIONS.md)

---

## Architecture Overview

```text
Meta Lead Testing Tool
         |
         v (HTTP POST Webhook)
Express Backend (/webhook)
         |
         v (Socket.IO emit 'new_lead')
React Native App (socket.on('new_lead'))
         |
         v
Live UI Update (No manual interaction)
```

1. **Meta Webhook Endpoint**: The Express server exposes `GET /webhook` for Meta verification and `POST /webhook` to receive leadgen events.
2. **Real-Time Push**: On receiving a webhook payload, the backend processes the event and emits a `new_lead` event across WebSocket via Socket.IO.
3. **Client Reception**: The React Native app listens to the socket connection and prepends the new lead to its local state, automatically updating the screen list.

---

## Getting Started

### 1. Backend Server

```bash
cd backend
npm install
npm start
```

The server runs on port `5000`:
- **Webhook Endpoint**: `http://localhost:5000/webhook`
- **Leads API**: `http://localhost:5000/api/leads`
- **Verify Token**: `meta_leads_poc_token` (configured in `.env` / default)

To run the automated verification checks:
```bash
npm test
```

### 2. React Native Mobile App

In a separate terminal:

```bash
cd mobile
npm install
npm start
```

Platform options:
- Press `w` to run in a web browser (`http://localhost:8081`).
- Press `a` for Android Emulator.
- Scan QR code via Expo Go on a physical device. *(If running on a physical device, update `SERVER_URL` in `mobile/App.js` to your computer's local network IP).*

---

## Connecting Meta Lead Testing Tool

1. Expose port `5000` via ngrok:
   ```bash
   ngrok http 5000
   ```

2. In your Meta App Dashboard under **Webhooks > Page**:
   - **Callback URL**: `https://<your-ngrok-domain>.ngrok-free.app/webhook`
   - **Verify Token**: `meta_leads_poc_token`
   - Subscribe to the `leadgen` field.

3. Open [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing):
   - Select your test Page and Lead Form.
   - Click **Create Lead** (or preview and submit the form).

4. **Observe the App**:
   - The lead appears at the top of the list in real time without refreshing the screen.

---

## Project Structure

```text
PoC_Meta_Lead_Sync/
├── backend/
│   ├── .env.example         # Environment template with placeholders
│   ├── package.json         # Backend dependencies and scripts
│   ├── package-lock.json
│   ├── server.js            # Express server and Socket.IO handler
│   ├── test-lead.js         # Offline payload simulation script
│   └── test_lead_flow.js    # Integration test suite
├── mobile/
│   ├── App.js               # React Native UI and live Socket.IO listener
│   ├── app.json             # Expo project configuration
│   ├── index.js             # Root entry point
│   ├── package.json         # Mobile dependencies
│   ├── package-lock.json
│   └── assets/              # App icons and assets
├── ASSUMPTIONS.md           # Architecture decisions & trade-offs
├── .gitignore
└── README.md
```

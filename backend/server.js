require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'meta_leads_poc_token';

// In-memory leads storage
const leads = [];

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// 1. Meta Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2. Meta Webhook Receiver
app.post('/webhook', async (req, res) => {
  // Acknowledge Meta immediately
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'leadgen') {
          const value = change.value || {};
          const leadgenId = value.leadgen_id;

          const lead = {
            leadId: String(leadgenId),
            formId: String(value.form_id || ''),
            pageId: String(value.page_id || ''),
            createdAt: new Date().toISOString(),
          };

          // Fetch full lead details if PAGE_ACCESS_TOKEN is provided
          if (process.env.PAGE_ACCESS_TOKEN) {
            try {
              const response = await axios.get(
                `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${process.env.PAGE_ACCESS_TOKEN}`
              );
              const fieldData = response.data?.field_data || [];
              fieldData.forEach((field) => {
                const name = (field.name || '').toLowerCase();
                const val = field.values?.[0] || '';
                if (name.includes('name')) lead.fullName = val;
                if (name.includes('email')) lead.email = val;
                if (name.includes('phone')) lead.phoneNumber = val;
              });
            } catch (err) {
              console.warn('Could not fetch from Graph API:', err.message);
            }
          }

          // Fallback fields for Meta Lead Testing Tool
          const suffix = String(leadgenId).slice(-4) || '0000';
          lead.fullName = lead.fullName || `Test Lead ${suffix}`;
          lead.email = lead.email || `test_${suffix}@example.com`;
          lead.phoneNumber = lead.phoneNumber || `+1 555-01${suffix}`;

          leads.unshift(lead);
          io.emit('new_lead', lead);
          console.log('Broadcasted new lead:', lead.leadId);
        }
      }
    }
  }
});

// 3. API endpoint for initial fetch
app.get('/api/leads', (req, res) => {
  res.json(leads);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
});

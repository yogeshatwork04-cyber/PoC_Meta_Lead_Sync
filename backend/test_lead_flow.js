const http = require('http');
const ioClient = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5000';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'meta_leads_poc_token';

async function runTests() {
  console.log('Running lead sync integration tests...');

  // 1. Initial leads check
  const initialLeadsRes = await fetch(`${BASE_URL}/api/leads`);
  if (!initialLeadsRes.ok) {
    throw new Error(`Failed to fetch /api/leads (${initialLeadsRes.status})`);
  }
  const initialLeads = await initialLeadsRes.json();
  console.log(`GET /api/leads status: ${initialLeadsRes.status}, count: ${initialLeads.length}`);

  // 2. Webhook verification handshake
  const challenge = 'test_challenge_98765';
  const verifyUrl = `${BASE_URL}/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}`;
  const verifyRes = await fetch(verifyUrl);
  const verifyText = await verifyRes.text();
  if (verifyRes.status !== 200 || verifyText !== challenge) {
    throw new Error(`Webhook verification failed (${verifyRes.status}): ${verifyText}`);
  }
  console.log('GET /webhook challenge verification passed');

  // Verify invalid token returns 403
  const badTokenUrl = `${BASE_URL}/webhook?hub.mode=subscribe&hub.verify_token=invalid_token&hub.challenge=${challenge}`;
  const badRes = await fetch(badTokenUrl);
  if (badRes.status !== 403) {
    throw new Error(`Expected 403 for invalid verify token, got ${badRes.status}`);
  }
  console.log('GET /webhook rejected invalid token with 403');

  // 3. Socket.IO connection
  const socket = ioClient(BASE_URL, { transports: ['websocket', 'polling'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket.IO connection timeout')), 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      console.log(`Socket client connected (${socket.id})`);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  const leadReceivedPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for new_lead event')), 5000);
    socket.on('new_lead', (lead) => {
      clearTimeout(timer);
      resolve(lead);
    });
  });

  // 4. Send test Meta leadgen webhook
  const testLeadId = '445566778899';
  const testPayload = {
    object: 'page',
    entry: [
      {
        id: '10987654321',
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'leadgen',
            value: {
              leadgen_id: testLeadId,
              page_id: '10987654321',
              form_id: '9988776655',
              created_time: Math.floor(Date.now() / 1000)
            }
          }
        ]
      }
    ]
  };

  const postRes = await fetch(`${BASE_URL}/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });
  const postText = await postRes.text();
  if (postRes.status !== 200 || postText !== 'EVENT_RECEIVED') {
    throw new Error(`Unexpected POST /webhook response: ${postRes.status} ${postText}`);
  }
  console.log(`POST /webhook acknowledged (${postRes.status} ${postText})`);

  // 5. Verify real-time event received
  const receivedLead = await leadReceivedPromise;
  if (receivedLead.leadId !== testLeadId) {
    throw new Error(`Lead ID mismatch: expected ${testLeadId}, got ${receivedLead.leadId}`);
  }
  console.log(`Real-time 'new_lead' event received for lead ${receivedLead.leadId}`);

  // 6. Verify leads store updated
  const updatedLeadsRes = await fetch(`${BASE_URL}/api/leads`);
  const updatedLeads = await updatedLeadsRes.json();
  const exists = updatedLeads.some((l) => l.leadId === testLeadId);
  if (!exists) {
    throw new Error(`Lead ${testLeadId} not found in /api/leads`);
  }
  console.log(`Lead stored in API list (total count: ${updatedLeads.length})`);

  socket.disconnect();
  console.log('All integration checks passed successfully.');
}

runTests().catch((err) => {
  console.error('Test error:', err.message);
  process.exit(1);
});

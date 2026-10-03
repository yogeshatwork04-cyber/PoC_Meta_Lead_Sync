const axios = require('axios');

const PORT = process.env.PORT || 5000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${PORT}/webhook`;

const leadgenId = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
const formId = '112233445566778';
const pageId = '998877665544332';
const createdTime = Math.floor(Date.now() / 1000);

const metaPayload = {
  object: 'page',
  entry: [
    {
      id: pageId,
      time: createdTime,
      changes: [
        {
          field: 'leadgen',
          value: {
            created_time: createdTime,
            leadgen_id: leadgenId,
            page_id: pageId,
            form_id: formId,
          },
        },
      ],
    },
  ],
};

async function sendTestLead() {
  console.log(`Sending leadgen webhook (ID: ${leadgenId}) to ${WEBHOOK_URL}...`);

  try {
    const res = await axios.post(WEBHOOK_URL, metaPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookexternalua',
      },
    });

    console.log(`Server response: [${res.status}] ${res.data}`);
  } catch (error) {
    console.error('Failed to send webhook:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error(`Connection refused. Ensure the backend server is running on port ${PORT}.`);
    }
  }
}

sendTestLead();

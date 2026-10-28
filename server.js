const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.json());

// Connect to Firebase
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Meta Webhook Verification
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];
  
  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive WhatsApp Messages and save to Firebase
app.post('/webhook', async (req, res) => {
  let body = req.body;
  if (body.object && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    let msg = body.entry[0].changes[0].value.messages[0];
    
    await db.collection('messages').add({
      from: msg.from,
      text: msg.text.body,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'received'
    });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
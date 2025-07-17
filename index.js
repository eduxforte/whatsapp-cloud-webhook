require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const messagesFile = path.join(__dirname, 'messages.json');

app.get('/webhook', (req, res) => {
  const verify_token = 'meuverificawhatsapp'; // mesmo token que você colocou no Facebook
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('Webhook verificado com sucesso');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

app.post('/webhook', (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];

  if (message) {
    const from = message.from;
    const text = message.text?.body || '';

    const allMessages = fs.existsSync(messagesFile)
      ? JSON.parse(fs.readFileSync(messagesFile))
      : {};

    if (!allMessages[from]) {
      allMessages[from] = [];
    }

    allMessages[from].push({ from, text, timestamp: Date.now() });

    fs.writeFileSync(messagesFile, JSON.stringify(allMessages, null, 2));
  }

  res.sendStatus(200);
});

app.get('/messages', (req, res) => {
  if (!fs.existsSync(messagesFile)) {
    return res.json({});
  }

  const messages = JSON.parse(fs.readFileSync(messagesFile));
  res.json(messages);
});

app.post('/send-message', async (req, res) => {
  const axios = require('axios');
  const { to, text } = req.body;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});

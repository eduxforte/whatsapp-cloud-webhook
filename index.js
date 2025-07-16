const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));  // serve arquivos da pasta public

let interacoes = [];

// Tentar carregar interações salvas, se arquivo existir
try {
  const data = fs.readFileSync('clientes.json', 'utf8');
  interacoes = JSON.parse(data);
} catch (e) {
  interacoes = [];
}

// Webhook que recebe as interações do WhatsApp
app.post('/webhook', (req, res) => {
  const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (msg?.type === 'interactive') {
    const numero = msg.from;
    const botao = msg.interactive?.button_reply?.title || 'Desconhecido';

    // Verificar se já existe essa interação para evitar duplicar
    const jaExiste = interacoes.find(i => i.numero === numero && i.botao === botao);
    if (!jaExiste) {
      interacoes.push({ numero, botao });
      fs.writeFileSync('clientes.json', JSON.stringify(interacoes, null, 2));
    }
  }
  res.sendStatus(200);
});

// Rota para retornar as interações (para o painel)
app.get('/interacoes', (req, res) => {
  res.json(interacoes);
});

// Rota para enviar mensagem para o cliente
app.post('/responder', async (req, res) => {
  const { numero, mensagem } = req.body;

  try {
    await axios.post(`https://graph.facebook.com/v19.0/713151888548596/messages`, {
      messaging_product: "whatsapp",
      to: numero,
      type: "text",
      text: { body: mensagem }
    }, {
      headers: {
        Authorization: `Bearer EAAKp50TZAjqgBPHonPTESWbS1ZCWYJalUsUlPp3NZBCh562FQAmZCNe3xFle6h8JzjJwPayz4mgLDy9ynTggnISKmWqGWFPDPz5iCDTSJOuzCMcKoYOY7GYIR1AY8i1Wh2rAFbN3KVtJQAADisdXApBhOKybZC2SYNdZCr0O6Qnh8yOn6LDUDm6EgfGwtV9PsqqUNT5jHIBakQCbVfrIe1hyLIwsHk0c22oZC2VkpX3dpbUdkytZBZCuAoBX8ZArafglgZD`,
        'Content-Type': 'application/json'
      }
    });
    res.json({ status: 'enviado' });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ erro: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


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
        Authorization: `Bearer EAAKp50TZAjqgBPNUI62rwAPzdQxbRpN2eBIcv5D44xxiRAHtE2AgmiLEaf8yacwfMjYVdGG0JwWBgC5W9QEEEc9yncMlxqvM28EYjD4SZC5OOo9TiHLiplAOVgSn7XKHqdZBj3B1m0DTT3ZACPji3s9ZAEGU8slFgIhvt2TYy6CttxhixK3ZAOy1YwVYdIi3A8iEAPndxM0EllbkhQRg33iCPPPJAO3LuyLfaZCwd9qY556Jr5zspR0N8DpCB57Lr8ZD`,
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


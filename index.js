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

// Webhook que recebe interações do WhatsApp
app.post('/webhook', (req, res) => {
  const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (msg?.type === 'interactive') {
    const numero = msg.from;
    const botao = msg.interactive?.button_reply?.title || 'Desconhecido';

    // Evitar duplicatas
    const jaExiste = interacoes.find(i => i.numero === numero && i.botao === botao);
    if (!jaExiste) {
      interacoes.push({ numero, botao });
      fs.writeFileSync('clientes.json', JSON.stringify(interacoes, null, 2));
    }
  }

  res.sendStatus(200);
});

// Painel para ver interações
app.get('/interacoes', (req, res) => {
  res.json(interacoes);
});

// Rota para responder manualmente pelo painel
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
        Authorization: `Bearer EAAKp50TZAjqgBPKA4FyrGVZBelc4mU1x06ZAei7IimqZBngwptQL3w8jO9pdkIfMcl5x1fR0Cgi9koYbZB98yNXpOhYPdIlwjflZAJsLFUO19pkFaUw0uU5EAIqENq7yKXEBnC9Lm18eu6Ld8mJp3RW5V9VF9aTwyrzqXF05ZBoLGld3Mk3k2WwfZA6bZCvWZBucnp4pvRdfyxx4qDBZAYovdgjeZBzDA2AsUZAscGiXO2FcytVmAiOLUQ4PfZAWVLaNMjMQZDZD`,
        'Content-Type': 'application/json'
      }
    });
    res.json({ status: 'enviado' });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ erro: error.response?.data || error.message });
  }
});

// ✅ NOVA ROTA: disparo com templates via Make
app.post('/send-message', async (req, res) => {
  const { to, template_name, language = 'pt_BR', parameters = [] } = req.body;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/713151888548596/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template_name,
          language: { code: language },
          components: [
            {
              type: 'body',
              parameters: parameters.map(p => ({
                type: 'text',
                text: p
              }))
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer EAAKp50TZAjqgBPKA4FyrGVZBelc4mU1x06ZAei7IimqZBngwptQL3w8jO9pdkIfMcl5x1fR0Cgi9koYbZB98yNXpOhYPdIlwjflZAJsLFUO19pkFaUw0uU5EAIqENq7yKXEBnC9Lm18eu6Ld8mJp3RW5V9VF9aTwyrzqXF05ZBoLGld3Mk3k2WwfZA6bZCvWZBucnp4pvRdfyxx4qDBZAYovdgjeZBzDA2AsUZAscGiXO2FcytVmAiOLUQ4PfZAWVLaNMjMQZDZD`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Erro ao enviar template:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

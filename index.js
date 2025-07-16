const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));  // serve arquivos da pasta public

// Webhook que recebe interações do WhatsApp
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      const numero = message.from;
      const texto = message.text?.body || '';
      const botao = message.button?.text || '';

      // Enviar interações para o Make
      if (botao || texto) {
        await axios.post('https://hook.us2.make.com/fsk7p1m16g46tzt7mpi8kbmlhbucy93y', {
          tipo: 'interacao',
          numero,
          mensagem: botao || texto,
          data: new Date().toISOString()
        });
      }

      // Enviar cliente único para o Make
      await axios.post('https://hook.us2.make.com/fsk7p1m16g46tzt7mpi8kbmlhbucy93y', {
        tipo: 'cliente',
        numero
      });
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
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
        Authorization: `Bearer SEU_TOKEN_DE_ACESSO_AQUI`,
        'Content-Type': 'application/json'
      }
    });
    res.json({ status: 'enviado' });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ erro: error.response?.data || error.message });
  }
});

// Rota para disparar templates via Make
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
          Authorization: `Bearer SEU_TOKEN_DE_ACESSO_AQUI`,
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

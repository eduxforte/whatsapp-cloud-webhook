const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // serve os arquivos painel.html, chat.html, etc

// Lista em memória para controle de clientes já enviados
let clientesEnviados = new Set();

// 🔄 Webhook que recebe interações do WhatsApp
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
      const conteudo = botao || texto;

      // Envia interação para Make
      if (conteudo) {
        await axios.post('https://hook.us2.make.com/fsk7p1m16g46tzt7mpi8kbmlhbucy93y', {
          tipo: 'interacao',
          numero,
          mensagem: conteudo,
          data: new Date().toISOString()
        });
      }

      // Envia cliente para Make apenas se ainda não enviado
      if (!clientesEnviados.has(numero)) {
        clientesEnviados.add(numero);
        await axios.post('https://hook.us2.make.com/fsk7p1m16g46tzt7mpi8kbmlhbucy93y', {
          tipo: 'cliente',
          numero
        });
      }
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// 🟢 Rota para responder manualmente pelo painel
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
        Authorization: `Bearer EAAKp50TZAjqgBPLcJHD6FK52RFrN2TZCsQOcVRkVNYhBvNCfqng1zDhhDo21aSHslXfyhPBnZCZBFjZB8ZAkIibSZAaH1uRvJyhTrzBMgsCGrGhCMv3PZBQqwmgHDQFGnGDh2qZC0VbJJjfSLNsvH8EXewXv87ZBEXRG6qOvg8ObvSEEpflE0074SvXov2pDqw7pIHccvWzGnUTRneZAyqbFoyic9hmzql5MckM1g4JioS3HTb7V3o4ZCdhTWZAPZBbwZDZD`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ status: 'enviado' });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ erro: error.response?.data || error.message });
  }
});

// 🟣 Rota para disparar mensagens com template via Make
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
          Authorization: `Bearer EAAKp50TZAjqgBPLcJHD6FK52RFrN2TZCsQOcVRkVNYhBvNCfqng1zDhhDo21aSHslXfyhPBnZCZBFjZB8ZAkIibSZAaH1uRvJyhTrzBMgsCGrGhCMv3PZBQqwmgHDQFGnGDh2qZC0VbJJjfSLNsvH8EXewXv87ZBEXRG6qOvg8ObvSEEpflE0074SvXov2pDqw7pIHccvWzGnUTRneZAyqbFoyic9hmzql5MckM1g4JioS3HTb7V3o4ZCdhTWZAPZBbwZDZD`,
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

// 📥 NOVA ROTA: Buscar clientes diretamente do Google Sheets via Make
app.get('/clientes', async (req, res) => {
  try {
    const resposta = await axios.get('https://hook.us2.make.com/fsk7p1m16g46tzt7mpi8kbmlhbucy93y?get=clientes');
    res.json(resposta.data);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar clientes da planilha' });
  }
});

// Webhook que recebe mensagens do Chatwoot
app.post('/chatwoot/webhook', async (req, res) => {
  console.log('📦 Corpo recebido do Chatwoot:', JSON.stringify(req.body, null, 2));

  const { content, contact } = req.body;
  const mensagem = content?.text || content?.message || ''; // mensagem enviada
  let numero = contact?.identifier || contact?.phone_number || '';
numero = numero.replace(/\D/g, ''); // remove tudo que não é número


  console.log('📩 Mensagem recebida do Chatwoot:', mensagem);
  console.log('📱 Enviando para número:', numero);

  if (numero && mensagem) {
    try {
      await axios.post(`https://graph.facebook.com/v19.0/713151888548596/messages`, {
        messaging_product: "whatsapp",
        to: numero,
        type: "text",
        text: { body: mensagem }
      }, {
        headers: {
          Authorization: `Bearer EAAKp50TZAjqgBPLcJHD6FK52RFrN2TZCsQOcVRkVNYhBvNCfqng1zDhhDo21aSHslXfyhPBnZCZBFjZB8ZAkIibSZAaH1uRvJyhTrzBMgsCGrGhCMv3PZBQqwmgHDQFGnGDh2qZC0VbJJjfSLNsvH8EXewXv87ZBEXRG6qOvg8ObvSEEpflE0074SvXov2pDqw7pIHccvWzGnUTRneZAyqbFoyic9hmzql5MckM1g4JioS3HTb7V3o4ZCdhTWZAPZBbwZDZD`,
          'Content-Type': 'application/json'
        }
      });

      return res.sendStatus(200);
    } catch (error) {
      console.error('❌ Erro ao responder no WhatsApp:', error.response?.data || error.message);
      return res.status(500).send('Erro ao enviar mensagem');
    }
  } else {
    return res.status(400).send('❌ Dados inválidos');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

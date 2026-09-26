import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createClient } from '@supabase/supabase-js';

const app = Fastify({ logger: true });

// Configurar CORS
app.register(cors, {
  origin: '*',
});

// Inicializar Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Rota raiz de teste
app.get('/', async (request, reply) => {
  return { status: 'online', message: 'NEVES CARONA Backend API' };
});

/**
 * Função para enviar mensagem via Meta WhatsApp Graph API
 */
async function sendWhatsAppMessage(to: string, bodyText: string) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const whatsappToken = process.env.META_WHATSAPP_TOKEN;

  if (!phoneNumberId || !whatsappToken) {
    console.error('ERRO: META_PHONE_NUMBER_ID ou META_WHATSAPP_TOKEN não estão configurados nas variáveis de ambiente.');
    return;
  }

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: bodyText,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro ao enviar mensagem pelo WhatsApp Graph API:', data);
    } else {
      console.log('Mensagem enviada com sucesso para:', to);
    }
  } catch (error) {
    console.error('Falha na requisição para a Graph API:', error);
  }
}

/**
 * WEBHOOK META WHATSAPP - VALIDAÇÃO (GET)
 */
app.get('/webhook', async (request, reply) => {
  const query = request.query as Record<string, string>;
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    app.log.info('Webhook verificado com sucesso pela Meta!');
    return reply.status(200).send(challenge);
  } else {
    app.log.warn('Falha na verificação do Webhook: Token inválido');
    return reply.status(403).send('Forbidden');
  }
});

/**
 * WEBHOOK META WHATSAPP - RECEBER MENSAGENS (POST)
 */
app.post('/webhook', async (request, reply) => {
  const body = request.body as any;

  try {
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message) {
        const from = message.from; // Número de quem enviou a mensagem
        const text = message.text?.body; // Conteúdo da mensagem

        app.log.info(`Mensagem recebida de ${from}: ${text}`);

        // Texto do Menu Inicial
        const menuInicial = 
`🚗 Olá! Bem-vindo ao CARONA!

Viagem dividida, economia garantida.

Como posso ajudar?

1️⃣ Encontrar uma viagem
2️⃣ Oferecer uma viagem
3️⃣ Minhas viagens
4️⃣ Meu cadastro
5️⃣ Como funciona`;

        // Dispara a resposta automática
        await sendWhatsAppMessage(from, menuInicial);
      }
    }

    return reply.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    app.log.error(error, 'Erro ao processar mensagem do Webhook');
    return reply.status(200).send('EVENT_RECEIVED');
  }
});

// Inicializar o servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = '0.0.0.0';

    await app.listen({ port, host });
    console.log(`Servidor rodando na porta ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
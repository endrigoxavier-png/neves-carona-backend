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
 * WEBHOOK META WHATSAPP - VALIDAÇÃO (GET)
 * Esta rota é chamada pela Meta para validar o Webhook.
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
 * Esta rota recebe os eventos e mensagens enviadas pelos utilizadores no WhatsApp.
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
        const from = message.from; // Número de quem enviou
        const text = message.text?.body; // Texto da mensagem

        app.log.info(`Mensagem recebida de ${from}: ${text}`);

        // Aqui podes adicionar a lógica para guardar na base de dados Supabase ou responder
      }
    }

    // Responder 200 OK para a Meta saber que o evento foi recebido
    return reply.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    app.log.error(error, 'Erro ao processar mensagem do Webhook');
    return reply.status(200).send('EVENT_RECEIVED'); // Responde 200 para evitar retentativas em loop da Meta
  }
});

// Inicializar o servidor na porta do ambiente (Render) ou 3000
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
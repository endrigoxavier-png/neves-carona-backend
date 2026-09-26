import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });

// Memória temporária de estados dos usuários (Sessão por WhatsApp ID)
// Em produção avançada, isso pode ser armazenado no Supabase
const userSessions: Record<string, { step: string; data?: any }> = {};

// Função auxiliar para enviar mensagem via WhatsApp Graph API
async function sendWhatsAppMessage(to: string, text: string) {
  const url = `https://graph.facebook.com/v20.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text },
    }),
  });
}

// ROTA GET: Validação do Webhook com a Meta
app.get('/webhook', async (request, reply) => {
  const mode = (request.query as any)['hub.mode'];
  const token = (request.query as any)['hub.verify_token'];
  const challenge = (request.query as any)['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return reply.status(200).send(challenge);
  }
  return reply.status(403).send('Forbidden');
});

// ROTA POST: Recebimento e Tráfego de Mensagens
app.post('/webhook', async (request, reply) => {
  const body = request.body as any;

  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
      const from = message.from; // Número do usuário (ex: 5517981110488)
      const text = message.text?.body?.trim().toLowerCase(); // Texto enviado pelo usuário

      // Busca ou inicializa o estado do usuário
      const currentSession = userSessions[from] || { step: 'IDLE' };

      // LOGICA DE ROTEAMENTO DO MENU
      if (text === 'oi' || text === 'ola' || text === 'menu' || currentSession.step === 'IDLE') {
        userSessions[from] = { step: 'MAIN_MENU' };
        
        const menuText = 
`🚗 *Olá! Bem-vindo ao CARONA!*
Viagem dividida, economia garantida.

Como posso ajudar?
1️⃣ Encontrar uma viagem
2️⃣ Oferecer uma viagem
3️⃣ Minhas viagens
4️⃣ Meu cadastro
5️⃣ Como funciona

_Responda com o número da opção desejada._`;

        await sendWhatsAppMessage(from, menuText);
      } 
      else if (currentSession.step === 'MAIN_MENU') {
        switch (text) {
          case '1':
            userSessions[from] = { step: 'SEARCH_RIDE' };
            await sendWhatsAppMessage(from, '🔍 *Encontrar uma viagem*\n\nPara qual cidade você deseja ir?\n1️⃣ São José do Rio Preto\n2️⃣ Mirassol\n3️⃣ Neves Paulista');
            break;

          case '2':
            userSessions[from] = { step: 'OFFER_RIDE_DESTINATION' };
            await sendWhatsAppMessage(from, '🚗 *Oferecer uma viagem*\n\nQual será o seu *destino*?\n1️⃣ São José do Rio Preto\n2️⃣ Mirassol\n3️⃣ Neves Paulista\n4️⃣ Outro');
            break;

          case '3':
            await sendWhatsAppMessage(from, '📋 *Minhas viagens*\n\nVocê ainda não possui viagens agendadas.\n\nDigite *Oi* para voltar ao menu.');
            userSessions[from] = { step: 'IDLE' };
            break;

          case '4':
            await sendWhatsAppMessage(from, '👤 *Meu cadastro*\n\nSeu número cadastrado é: ' + from + '\n\nDigite *Oi* para voltar ao menu.');
            userSessions[from] = { step: 'IDLE' };
            break;

          case '5':
            await sendWhatsAppMessage(from, '❓ *Como funciona*\n\nO CARONA conecta motoristas com lugares vagos a passageiros que vão para o mesmo destino!\n\nDigite *Oi* para voltar ao menu.');
            userSessions[from] = { step: 'IDLE' };
            break;

          default:
            await sendWhatsAppMessage(from, '⚠️ Opção inválida. Por favor, responda com um número de *1 a 5*.');
            break;
        }
      } 
      else if (currentSession.step === 'OFFER_RIDE_DESTINATION') {
        // Exemplo da próxima etapa após o usuário escolher a opção 2
        userSessions[from] = { step: 'OFFER_RIDE_DATE', data: { destination: text } };
        await sendWhatsAppMessage(from, '📅 Perfeito! Qual a *data* da viagem? (Exemplo: DD/MM)');
      }
      else {
        // Caso o usuário mande algo fora do fluxo, reseta para o menu
        userSessions[from] = { step: 'MAIN_MENU' };
        await sendWhatsAppMessage(from, 'Digite *Oi* para ver as opções do menu.');
      }
    }

    return reply.status(200).send({ status: 'ok' });
  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    return reply.status(200).send({ status: 'error_logged' });
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Servidor rodando na porta ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
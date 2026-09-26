import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });

// Memória temporária de estados dos usuários
const userSessions: Record<string, { step: string; data?: any }> = {};

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

app.get('/webhook', async (request, reply) => {
  const mode = (request.query as any)['hub.mode'];
  const token = (request.query as any)['hub.verify_token'];
  const challenge = (request.query as any)['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return reply.status(200).send(challenge);
  }
  return reply.status(403).send('Forbidden');
});

app.post('/webhook', async (request, reply) => {
  const body = request.body as any;

  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body?.trim().toLowerCase();

      // Recupera a sessão atual (padrão 'MAIN_MENU' se não existir)
      const currentSession = userSessions[from] || { step: 'MAIN_MENU' };

      // Se o usuário digitar explicitamente "oi", "ola" ou "menu", força a exibição do menu inicial
      if (text === 'oi' || text === 'ola' || text === 'menu') {
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
        return reply.status(200).send({ status: 'ok' });
      }

      // TRATAMENTO DAS OPÇÕES DO MENU PRINCIPAL
      if (currentSession.step === 'MAIN_MENU') {
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
            break;

          case '4':
            await sendWhatsAppMessage(from, '👤 *Meu cadastro*\n\nSeu número cadastrado é: ' + from + '\n\nDigite *Oi* para voltar ao menu.');
            break;

          case '5':
            await sendWhatsAppMessage(from, '❓ *Como funciona*\n\nO CARONA conecta motoristas com lugares vagos a passageiros que vão para o mesmo destino!\n\nDigite *Oi* para voltar ao menu.');
            break;

          default:
            await sendWhatsAppMessage(from, '⚠️ Opção inválida. Por favor, escolha um número de *1 a 5* ou envie *Oi* para recarregar o menu.');
            break;
        }
      } 
      else if (currentSession.step === 'OFFER_RIDE_DESTINATION') {
        userSessions[from] = { step: 'OFFER_RIDE_DATE', data: { destination: text } };
        await sendWhatsAppMessage(from, '📅 Perfeito! Qual a *data* da viagem? (Exemplo: 29/09)');
      }
      else {
        userSessions[from] = { step: 'MAIN_MENU' };
        await sendWhatsAppMessage(from, 'Digite *Oi* para ver as opções do menu.');
      }
    }

    return reply.status(200).send({ status: 'ok' });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return reply.status(200).send({ status: 'error' });
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
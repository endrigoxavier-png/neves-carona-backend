import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { 
  cadastrarOuBuscarUsuario, 
  cadastrarVeiculo, 
  buscarPerfilPorWhatsapp 
} from './usuarios';
import { 
  cadastrarViagem, 
  listarViagensMotorista, 
  buscarViagensDisponiveis, 
  reservarVaga 
} from './viagens';

dotenv.config();

const app = Fastify({ logger: true });

app.register(cors, { origin: true });

// Rotas de Usuários e Veículos
app.post('/usuarios', async (request, reply) => {
  try {
    const usuario = await cadastrarOuBuscarUsuario(request.body as any);
    return reply.status(201).send(usuario);
  } catch (error: any) {
    return reply.status(400).send({ erro: error.message });
  }
});

app.get('/usuarios/whatsapp/:whatsapp', async (request, reply) => {
  try {
    const { whatsapp } = request.params as { whatsapp: string };
    const usuario = await buscarPerfilPorWhatsapp(whatsapp);
    if (!usuario) return reply.status(404).send({ erro: 'Usuário não encontrado' });
    return reply.send(usuario);
  } catch (error: any) {
    return reply.status(400).send({ erro: error.message });
  }
});

app.post('/veiculos', async (request, reply) => {
  try {
    const veiculo = await cadastrarVeiculo(request.body as any);
    return reply.status(201).send(veiculo);
  } catch (error: any) {
    return reply.status(400).send({ erro: error.message });
  }
});

// Rotas de Viagens
app.post('/viagens', async (request, reply) => {
  try {
    const viagem = await cadastrarViagem(request.body as any);
    return reply.status(201).send(viagem);
  } catch (error: any) {
    return reply.status(400).send({ erro: error.message });
  }
});

app.get('/viagens/motorista/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const viagens = await listarViagensMotorista(id);
    return reply.send(viagens);
  } catch (error: any) {
    return reply.status(400).send({ erro: error.message });
  }
});

app.get('/viagens/busca', async (request, reply) => {
  try {
    const { origem, destino, data } = request.query as { origem?: string; destino?: string; data?: string };
    const viagens = await buscarViagensDisponiveis(origem, destino, data);
    return reply.send(viagens);
  } catch (error: any) {
    return reply.status(400).send({ erro: error.message });
  }
});

app.post('/reservas', async (request, reply) => {
  try {
    const { viagem_id, passageiro_id, quantidade_vagas } = request.body as {
      viagem_id: string;
      passageiro_id: string;
      quantidade_vagas?: number;
    };

    const reserva = await reservarVaga(viagem_id, passageiro_id, quantidade_vagas || 1);
    return reply.status(201).send({ mensagem: 'Reserva realizada com sucesso!', reserva });
  } catch (error: any) {
    return reply.status(400).send({ erro: error.message });
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Servidor NEVES CARONA rodando na porta ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
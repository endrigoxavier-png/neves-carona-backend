import { supabase } from './supabase';

// 1. Cadastrar/Publicar uma nova viagem
export async function cadastrarViagem(dados: {
  motorista_id: string;
  veiculo_id: string;
  origem: string;
  destino: string;
  data_viagem: string;
  hora_saida: string;
  quantidade_vagas: number;
  valor_rateio: number;
}) {
  const { data, error } = await supabase
    .from('viagens')
    .insert([
      {
        ...dados,
        vagas_disponiveis: dados.quantidade_vagas,
        status: 'ativa',
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Erro ao cadastrar viagem: ${error.message}`);
  return data;
}

// 2. Listar viagens oferecidas por um motorista específico
export async function listarViagensMotorista(motorista_id: string) {
  const { data: viagens, error: erroViagens } = await supabase
    .from('viagens')
    .select('*')
    .eq('motorista_id', motorista_id);

  if (erroViagens) throw new Error(`Erro ao buscar viagens: ${erroViagens.message}`);
  if (!viagens || viagens.length === 0) return [];

  const resultados = await Promise.all(
    viagens.map(async (viagem) => {
      const { data: veiculo } = await supabase
        .from('veiculos')
        .select('modelo, cor, placa')
        .eq('id', viagem.veiculo_id)
        .maybeSingle();

      return {
        ...viagem,
        veiculo: veiculo || null,
      };
    })
  );

  return resultados;
}

// 3. Buscar viagens disponíveis para passageiros
export async function buscarViagensDisponiveis(origem?: string, destino?: string, data_viagem?: string) {
  let query = supabase
    .from('viagens')
    .select('*')
    .eq('status', 'ativa')
    .gt('vagas_disponiveis', 0);

  if (origem) query = query.ilike('origem', `%${origem}%`);
  if (destino) query = query.ilike('destino', `%${destino}%`);
  if (data_viagem) query = query.eq('data_viagem', data_viagem);

  const { data: viagens, error } = await query;
  if (error) throw new Error(`Erro ao buscar viagens: ${error.message}`);

  return viagens;
}

// 4. Reservar uma vaga na viagem
export async function reservarVaga(viagem_id: string, passageiro_id: string, quantidade_vagas: number = 1) {
  const { data: viagem, error: erroViagem } = await supabase
    .from('viagens')
    .select('vagas_disponiveis')
    .eq('id', viagem_id)
    .single();

  if (erroViagem || !viagem) throw new Error('Viagem não encontrada.');
  if (viagem.vagas_disponiveis < quantidade_vagas) throw new Error('Vagas insuficientes.');

  const { data: reserva, error: erroReserva } = await supabase
    .from('reservas')
    .insert([
      {
        viagem_id,
        passageiro_id,
        quantidade_vagas,
        status: 'pendente',
      },
    ])
    .select()
    .single();

  if (erroReserva) throw new Error(`Erro ao criar reserva: ${erroReserva.message}`);

  await supabase
    .from('viagens')
    .update({ vagas_disponiveis: viagem.vagas_disponiveis - quantidade_vagas })
    .eq('id', viagem_id);

  return reserva;
}
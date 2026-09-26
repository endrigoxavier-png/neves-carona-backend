import { supabase } from './supabase';

export interface CadastroUsuarioInput {
  nome: string;
  whatsapp: string;
  cidade: string;
  e_motorista?: boolean;
  tipo_chave_pix?: string;
  chave_pix?: string;
}

export interface CadastroVeiculoInput {
  usuario_id: string;
  modelo: string;
  marca: string;
  cor: string;
  placa: string;
  quantidade_vagas: number;
}

export async function cadastrarOuBuscarUsuario(dados: CadastroUsuarioInput) {
  const { data: usuarioExistente } = await supabase
    .from('usuarios')
    .select('*')
    .eq('whatsapp', dados.whatsapp)
    .maybeSingle();

  if (usuarioExistente) {
    return usuarioExistente;
  }

  const { data, error } = await supabase
    .from('usuarios')
    .insert([dados])
    .select()
    .single();

  if (error) throw new Error(`Erro ao cadastrar usuário: ${error.message}`);
  return data;
}

export async function buscarPerfilPorWhatsapp(whatsapp: string) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('whatsapp', whatsapp)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar perfil: ${error.message}`);
  return data;
}

export async function cadastrarVeiculo(dados: CadastroVeiculoInput) {
  const { data, error } = await supabase
    .from('veiculos')
    .insert([dados])
    .select()
    .single();

  if (error) throw new Error(`Erro ao cadastrar veículo: ${error.message}`);
  return data;
}
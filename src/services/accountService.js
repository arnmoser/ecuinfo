import { supabase } from './supabase.js';

/**
 * Carrega os dados da conta de um usuário, incluindo seu uso e ECU packs associados.
 * Garante que a query não seja ambígua e retorna um objeto de conta com
 * estrutura padrão mesmo que não haja registros de uso ou packs.
 *
 * @param {string} userId - O ID do usuário (auth.users.id).
 * @returns {object} Um objeto representando a conta do usuário.
 */
export async function loadAccount(userId) {
  // A correção está no select: 'account_ecu_packs!account_ecu_packs_account_id_fkey'
  // especifica qual relacionamento usar, resolvendo a ambiguidade.
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id,
      status,
      demo_expires_at,
      account_usage (
        projects,
        uploads,
        comparisons
      ),
      account_ecu_packs!account_ecu_packs_account_id_fkey (
        ecu_pack_id
      )
    `)
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao carregar a conta:', error);
    throw error;
  }

  // Se .maybeSingle() não encontrar uma conta, data será null.
  // Retornamos uma estrutura padrão para não quebrar o bootstrap.
  if (!data) {
    return {
      id: null,
      status: 'not_found',
      demo_expires_at: null,
      usage: { projects: 0, uploads: 0, comparisons: 0 },
      ecuPacks: []
    };
  }

  // account_usage é uma relação to-one, mas o Supabase a retorna como um array.
  // Usamos ?. e ?? para garantir um fallback seguro.
  const usage = data.account_usage?.[0] ?? { projects: 0, uploads: 0, comparisons: 0 };

  // Mapeamos os IDs dos ECU packs, com fallback para um array vazio.
  const ecuPacks = data.account_ecu_packs?.map(p => p.ecu_pack_id) ?? [];

  return {
    id: data.id,
    status: data.status,
    demo_expires_at: data.demo_expires_at,
    usage: usage,
    ecuPacks: ecuPacks
  };
}

import { supabase } from './supabase.js';

// LOGIN
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[auth] signIn:', error);
    throw error;
  }

  return data.user;
}

// LOGOUT
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[auth] signOut error:', error);
    throw error;
  }
}

/**
 * Registra um novo usuário no Supabase Auth.
 * O trigger no banco de dados cuidará da criação dos registros
 * em 'accounts' e 'account_usage' automaticamente.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data, error }>}
 */
export async function signUpNewUser(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Erro no registro:', error.message);
  } else {
    // Opcional: mostrar uma mensagem para o usuário checar o e-mail de confirmação.
    alert('Registro realizado! Verifique seu e-mail para confirmar a conta.');
  }

  return { data, error };
}
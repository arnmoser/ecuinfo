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
export async function signUpNewUser(email, password, legalMetadata = null, whatsappData = null) {
  const signUpPayload = {
    email,
    password
  };

  if (legalMetadata) {
    signUpPayload.options = { data: legalMetadata };
  }

  const { data, error } = await supabase.auth.signUp(signUpPayload);

  if (error) {
    console.error('Erro no registro:', error.message);
    return { data, error };
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error('Erro no auto-login pós-registro:', signInError.message);
    return { data, error: signInError };
  }

  if (signInData?.user && whatsappData) {
    // Buscar o usuário autenticado conforme exigido
    const { data: authData, error: userError } = await supabase.auth.getUser();

    if (userError || !authData?.user) {
      console.error('Erro ao recuperar usuário autenticado:', userError?.message);
      return { data: signInData, error: userError || new Error('Usuário não validado') };
    }

    const { error: updateError } = await supabase.from('accounts')
      .update({
        whatsapp: whatsappData.whatsapp,
        whatsapp_marketing_consent: whatsappData.whatsapp_marketing_consent,
        whatsapp_marketing_consent_at: whatsappData.whatsapp_marketing_consent_at
      })
      .eq('owner_user_id', authData.user.id);

    if (updateError) {
      console.error('Erro ao atualizar dados do WhatsApp:', updateError.message);
      return { data: signInData, error: updateError };
    }
  }
  // O feedback ao usuário é dado na camada de UI (ui-login.js)

  return { data: signInData, error: null };
}

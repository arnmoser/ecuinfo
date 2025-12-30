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



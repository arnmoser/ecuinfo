import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://tyxjiyttkkpicmxzwjhr.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5eGppeXR0a2twaWNteHp3amhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzY5MDAsImV4cCI6MjA4MTU1MjkwMH0.d2Fkb6hyk3ry88cEke1ymdi22bOSH6wC3a7aILtx5x8';

const LEGAL_DEFAULTS = {
  terms_version: '1.0',
  privacy_version: '1.0'
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type AuthMode = 'login' | 'register';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function getCurrentLegalVersions() {
  const { data, error } = await supabase
    .from('legal_versions')
    .select('terms_version, privacy_version')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return LEGAL_DEFAULTS;

  return {
    terms_version: data.terms_version ?? LEGAL_DEFAULTS.terms_version,
    privacy_version: data.privacy_version ?? LEGAL_DEFAULTS.privacy_version
  };
}

function normalizeWhatsApp(value: string) {
  return value.replace(/[^\d]/g, '');
}

function isValidWhatsApp(value: string) {
  return value.length >= 10 && value.length <= 13;
}

function getAuthErrorMessage(message: string) {
  if (message.includes('Invalid login credentials')) return 'Email or password is invalid.';
  if (message.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
  if (message.includes('rate limit exceeded')) return 'Too many attempts. Please try again soon.';
  return 'Unexpected authentication error. Please try again.';
}

export function mapAuthError(error: unknown) {
  if (error instanceof Error) {
    return getAuthErrorMessage(error.message);
  }
  return 'Connection error. Please try again.';
}

export async function signUpNewUser(email: string, password: string, whatsapp: string, acceptMarketing: boolean) {
  if (password.length < 6) {
    throw new Error('Password must contain at least 6 characters.');
  }

  const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
  if (!isValidWhatsApp(normalizedWhatsapp)) {
    throw new Error('Please enter a valid WhatsApp number.');
  }

  const legalVersions = await getCurrentLegalVersions();
  const signUpPayload = {
    email,
    password,
    options: {
      data: {
        terms_version: legalVersions.terms_version,
        privacy_version: legalVersions.privacy_version,
        accepted_at: new Date().toISOString(),
        user_agent: navigator.userAgent
      }
    }
  };

  const { error } = await supabase.auth.signUp(signUpPayload);
  if (error) throw error;

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const userId = signInData.user?.id;
  if (!userId) return;

  const { error: updateError } = await supabase
    .from('accounts')
    .update({
      whatsapp: normalizedWhatsapp,
      whatsapp_marketing_consent: acceptMarketing,
      whatsapp_marketing_consent_at: acceptMarketing ? new Date().toISOString() : null
    })
    .eq('owner_user_id', userId);

  if (updateError) throw updateError;
}

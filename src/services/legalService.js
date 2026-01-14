import { supabase } from './supabase.js';
import { LEGAL_DEFAULTS, LEGAL_STORAGE_KEY } from '../constants.js';

function normalizeLegalVersions(raw) {
  if (!raw) return { ...LEGAL_DEFAULTS };
  return {
    terms_version: raw.terms_version ?? LEGAL_DEFAULTS.terms_version,
    privacy_version: raw.privacy_version ?? LEGAL_DEFAULTS.privacy_version,
    terms_effective_at: raw.terms_effective_at ?? LEGAL_DEFAULTS.terms_effective_at,
    privacy_effective_at: raw.privacy_effective_at ?? LEGAL_DEFAULTS.privacy_effective_at
  };
}

export async function getCurrentLegalVersions() {
  const { data, error } = await supabase
    .from('legal_versions')
    .select('terms_version, privacy_version, terms_effective_at, privacy_effective_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[legal] Failed to load legal versions, using defaults:', error);
    }
    return { ...LEGAL_DEFAULTS };
  }

  return normalizeLegalVersions(data);
}

export function formatLegalDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  return date.toLocaleDateString('pt-BR');
}

export function buildAcceptancePayload(legalVersions) {
  return {
    terms_version: legalVersions.terms_version,
    privacy_version: legalVersions.privacy_version,
    accepted_at: new Date().toISOString(),
    user_agent: navigator.userAgent
  };
}

export function savePendingLegalAcceptance(payload) {
  try {
    localStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[legal] Failed to persist pending acceptance:', error);
  }
}

export function loadPendingLegalAcceptance() {
  try {
    const raw = localStorage.getItem(LEGAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[legal] Failed to read pending acceptance:', error);
    return null;
  }
}

export function clearPendingLegalAcceptance() {
  try {
    localStorage.removeItem(LEGAL_STORAGE_KEY);
  } catch (error) {
    console.warn('[legal] Failed to clear pending acceptance:', error);
  }
}

export async function checkLegalAcceptance(userId, legalVersions) {
  if (!userId) {
    return { accepted: false, error: null };
  }

  const { data, error } = await supabase
    .from('user_legal_acceptance')
    .select('id')
    .eq('user_id', userId)
    .eq('terms_version', legalVersions.terms_version)
    .eq('privacy_version', legalVersions.privacy_version)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { accepted: null, error };
  }

  return { accepted: Boolean(data), error: null };
}

export async function recordLegalAcceptance(userId, legalVersions, userAgent) {
  const payload = {
    terms_version: legalVersions.terms_version,
    privacy_version: legalVersions.privacy_version
  };

  const { data, error } = await supabase.rpc('accept_legal', payload);
  if (!error) {
    return { data, error: null };
  }

  if (error.code === '42883' || error.code === '42P01') {
    const { error: insertError } = await supabase
      .from('user_legal_acceptance')
      .insert({
        user_id: userId,
        terms_version: payload.terms_version,
        privacy_version: payload.privacy_version,
        accepted_at: new Date().toISOString(),
        user_agent: userAgent ?? navigator.userAgent
      });

    return { data: null, error: insertError };
  }

  return { data: null, error };
}

export function matchesLegalVersions(payload, legalVersions) {
  if (!payload) return false;
  return (
    payload.terms_version === legalVersions.terms_version &&
    payload.privacy_version === legalVersions.privacy_version
  );
}

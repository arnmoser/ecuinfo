/* storage.js - Persistência local (offline-first) */

import { STORAGE_KEY, LAST_MODULE_KEY } from './constants.js';
import { state } from './state.js';

/**
 * Carrega dados do localStorage para o state global
 */
export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      // validação defensiva
      state.modules = Array.isArray(parsed.modules)
        ? parsed.modules
        : [];
    } else {
      state.modules = [];
    }

    const last = localStorage.getItem(LAST_MODULE_KEY);
    if (last) {
      state.currentModuleId = last;
    }

    // fallback seguro
    if (!state.currentModuleId && state.modules[0]) {
      state.currentModuleId = state.modules[0].id;
    }
  } catch (err) {
    console.error('[storage] Erro ao carregar dados locais', err);
    state.modules = [];
    state.currentModuleId = null;
  }
}

/**
 * Salva estado atual no localStorage
 * RETORNA o payload salvo (obrigatório para sync remoto)
 */
export function saveToStorage() {
  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    modules: state.modules
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    if (state.currentModuleId) {
      localStorage.setItem(LAST_MODULE_KEY, state.currentModuleId);
    }

    console.log('[storage] Dados salvos localmente');

    return payload; // CRÍTICO: usado pelo Supabase
  } catch (err) {
    console.error('[storage] Erro ao salvar dados locais', err);
    throw err; // deixa quem chamou decidir o que fazer
  }
}

/**
 * Remove completamente os dados locais
 * Útil para logout ou reset
 */
export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_MODULE_KEY);
    console.log('[storage] Storage limpo');
  } catch (err) {
    console.error('[storage] Erro ao limpar storage', err);
  }
}

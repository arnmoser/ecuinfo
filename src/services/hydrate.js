// services/hydrate.js
import { state } from '../state.js';
import { fetchSystemModules, mergeSystemModules } from './systemModulesService..js';

export async function hydrateStateFromPayload(payload) {
  const userModules = Array.isArray(payload?.modules) ? payload.modules : [];
  
  const systemModules = await fetchSystemModules();
  
  state.modules = mergeSystemModules(systemModules, userModules);
  
  if (!state.modules.find(m => m.id === state.currentModuleId)) {
    state.currentModuleId = state.modules[0]?.id ?? null;
  }

  state.dirty = false;
}

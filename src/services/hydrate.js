// services/hydrate.js
import { state } from '../state.js';

export function hydrateStateFromPayload(payload) {
  state.modules = Array.isArray(payload?.modules)
    ? payload.modules
    : [];

  state.currentModuleId =
    state.modules[0]?.id ?? null;

  state.dirty = false;
}

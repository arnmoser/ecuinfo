/* services/supabaseStorage.js */

import { supabase } from './supabase.js';
import { state } from '../state.js';

/* =====================================================
   SAVE (CREATE / UPDATE)
   ===================================================== */
export async function saveProjectToSupabase(payload) {
  if (!state.user) {
    throw new Error('Usuário não autenticado');
  }

  if (!payload) {
    throw new Error('Payload inválido');
  }

  const project = {
    user_id: state.user.id,
    name: state.currentProjectName ?? 'Projeto sem nome',
    data: payload
  };

  // Atualização: envia ID existente
  if (state.currentProjectId) {
    project.id = state.currentProjectId;
  }

  const { data, error } = await supabase
    .from('projects')
    .upsert(project, { onConflict: 'id' })
    .select('id')
    .single();

  if (error) {
  const handled = await handleSupabaseError(error);
  if (handled) return; // interrompe fluxo
  throw error;
  }

  // Sincroniza ID local com o banco
  state.currentProjectId = data.id;

  return data.id;
}

/* =====================================================
   LOAD (BY ID)
   ===================================================== */
export async function loadProjectFromSupabase(projectId) {
  if (!state.user) {
    throw new Error('Usuário não autenticado');
  }

  if (!projectId) {
    return null;
  }

  const { data, error } = await supabase
    .from('projects')
    .select('data')
    .eq('id', projectId)
    .eq('user_id', state.user.id)
    .single();

  if (error) {
  const handled = await handleSupabaseError(error);
  if (handled) return; // interrompe fluxo
  throw error;
  }

  return data?.data ?? null;
}

/* =====================================================
   LIST (USER PROJECTS)
   ===================================================== */
export async function listProjectsFromSupabase() {
  if (!state.user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });

  if (error) {
  const handled = await handleSupabaseError(error);
  if (handled) return; // interrompe fluxo
  throw error;
  }

  return data ?? [];
}

/* =====================================================
   ===================================================== */
export async function deleteProjectFromSupabase(projectId) {
  if (!state.user) {
    throw new Error('Usuário não autenticado');
  }

  if (!projectId) {
    throw new Error('ID do projeto inválido');
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', state.user.id);

  if (error) {
  const handled = await handleSupabaseError(error);
  if (handled) return; // interrompe fluxo
  throw error;
  }

  // Limpa estado se apagou o projeto atual
  if (state.currentProjectId === projectId) {
    state.currentProjectId = null;
  }
}

export async function getProjectsFromSupabase() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, data, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    const handled = await handleSupabaseError(error);
  if (handled) return;
  throw error;
  }

  if (!data || data.length === 0) {
    state.modules = [];
    state.currentModuleId = null;
    return;
  }

  /**
   * MVP assumption:
   * - carrega o projeto mais recente
   * - depois você pode permitir múltiplos projetos
   */
  const latestProject = data[0];
  const payload = latestProject.data;

  // validação defensiva (igual ao storage)
  state.modules = Array.isArray(payload?.modules)
    ? payload.modules
    : [];

  state.currentModuleId =
    state.modules[0]?.id ?? null;
}

export async function loadOrCreateUserProject() {
  if (!state.user) {
    throw new Error('Usuário não autenticado');
  }

  if (state.currentProjectId) {
    return {
      id: state.currentProjectId,
      data: { modules: state.modules }
    };
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, data')
    .eq('user_id', state.user.id)
    .single();

  if (error) {
  const handled = await handleSupabaseError(error);
  if (handled) return;
  throw error;
}

  if (data) return data;

  const emptyPayload = {
    version: 1,
    modules: []
  };

  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert({
      user_id: state.user.id,
      data: emptyPayload
    })
    .select('id, data')
    .single();

  if (createError) throw createError;

  return created;
}

async function handleSupabaseError(error) {
  if (
    error?.name === 'AuthApiError' ||
    error?.code === 'PGRST301' // sessão expirada
  ) {
    await supabase.auth.signOut();
    return true;
  }
  return false;
}

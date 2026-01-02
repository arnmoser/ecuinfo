/* services/supabaseStorage.js */

import { supabase } from './supabase.js';
import { state } from '../state.js';

/* =====================================================
   INTERNAL HELPERS
   ===================================================== */

function ensureAuth() {
  if (!state.user) {
    throw new Error('Usuário não autenticado');
  }
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { version: 1, modules: [] };
  }

  return {
    version: payload.version ?? 1,
    modules: Array.isArray(payload.modules)
      ? payload.modules
      : []
  };
}

async function handleSupabaseError(error) {
  if (
    error?.name === 'AuthApiError' ||
    error?.code === 'PGRST301'
  ) {
    await supabase.auth.signOut();
    return true;
  }
  return false;
}

/* =====================================================
   SAVE (CREATE / UPDATE)
   ===================================================== */
export async function saveProjectToSupabase(payload) {
  ensureAuth();

  const dataPayload = normalizePayload(payload);
  const name = state.currentProjectName ?? 'Projeto sem nome';

  // CREATE
  if (!state.currentProjectId) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: state.user.id,
        name,
        data: dataPayload
      })
      .select('id')
      .single();

    if (error) {
      const handled = await handleSupabaseError(error);
      if (handled) return;
      throw error;
    }

    state.currentProjectId = data.id;
    return data.id;
  }

  // UPDATE
  const { data, error } = await supabase
    .from('projects')
    .update({
      name,
      data: dataPayload,
      updated_at: new Date().toISOString()
    })
    .eq('id', state.currentProjectId)
    .select('id')
    .single();

  if (error) {
    const handled = await handleSupabaseError(error);
    if (handled) return;
    throw error;
  }

  return data.id;
}

/* =====================================================
   LOAD (BY ID)
   ===================================================== */
export async function loadProjectFromSupabase(projectId) {
  ensureAuth();

  if (!projectId) return null;

  const { data, error } = await supabase
    .from('projects')
    .select('data')
    .eq('id', projectId)
    .single();

  if (error) {
    const handled = await handleSupabaseError(error);
    if (handled) return null;
    throw error;
  }

  return normalizePayload(data?.data);
}

/* =====================================================
   LIST (USER PROJECTS)
   ===================================================== */
export async function listProjectsFromSupabase() {
  ensureAuth();

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    const handled = await handleSupabaseError(error);
    if (handled) return [];
    throw error;
  }

  return data ?? [];
}

/* =====================================================
   DELETE
   ===================================================== */
export async function deleteProjectFromSupabase(projectId) {
  ensureAuth();

  if (!projectId) {
    throw new Error('ID do projeto inválido');
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    const handled = await handleSupabaseError(error);
    if (handled) return;
    throw error;
  }

  if (state.currentProjectId === projectId) {
    state.currentProjectId = null;
    state.modules = [];
    state.currentModuleId = null;
  }
}

/* =====================================================
   LOAD MOST RECENT (MVP)
   ===================================================== */
export async function getProjectsFromSupabase() {
  ensureAuth();

  const { data, error } = await supabase
    .from('projects')
    .select('id, data, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    const handled = await handleSupabaseError(error);
    if (handled) return;
    throw error;
  }

  if (!data || data.length === 0) {
    state.modules = [];
    state.currentModuleId = null;
    state.currentProjectId = null;
    return;
  }

  const latestProject = data[0];
  const payload = normalizePayload(latestProject.data);

  state.currentProjectId = latestProject.id;
  state.modules = payload.modules;
  state.currentModuleId = state.modules[0]?.id ?? null;
}

/* =====================================================
   LOAD OR CREATE (LEGACY COMPAT)
   ===================================================== */
export async function loadOrCreateUserProject() {
  ensureAuth();

  if (state.currentProjectId) {
    return {
      id: state.currentProjectId,
      data: { modules: state.modules }
    };
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, data')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    const handled = await handleSupabaseError(error);
    if (handled) return;
    throw error;
  }

  if (data) {
    state.currentProjectId = data.id;
    return data;
  }

  const emptyPayload = { version: 1, modules: [] };

  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert({
      user_id: state.user.id,
      data: emptyPayload
    })
    .select('id, data')
    .single();

  if (createError) throw createError;

  state.currentProjectId = created.id;
  return created;
}

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
    throw error;
  }

  return data ?? [];
}

/* =====================================================
   DELETE (OPTIONAL, MAS LIMPO)
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
    throw error;
  }

  // Limpa estado se apagou o projeto atual
  if (state.currentProjectId === projectId) {
    state.currentProjectId = null;
  }
}

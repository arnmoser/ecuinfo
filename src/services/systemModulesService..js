import { supabase } from './supabase.js';

export async function fetchSystemModules() {
  const { data, error } = await supabase
    .from('system_modules')
    .select('*')
    .order('name');

  if (error) throw error;

  return data ?? [];
}

export function mergeSystemModules(systemModules, userModules) {

  const normalizedSystem = systemModules.map(m => ({
    id: `mod_sys_${m.slug}`,
    name: m.name,
    notes: m.notes || m.description || '',
    photo: '',
    photo_path: m.photo_path ? `system/${m.photo_path}` : null,
    marks: m.marks || [],
    isSystem: true,
    originalSystemId: m.id
  }));

  return [
    ...normalizedSystem,
    ...userModules.map(m => ({
      ...m,
      isSystem: false
    }))
  ];
}

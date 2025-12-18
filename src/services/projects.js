import { supabase } from './supabase.js';

export async function getProjects() {
  return supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
}

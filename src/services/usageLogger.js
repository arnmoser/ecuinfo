import { supabase } from './supabase.js';

export async function logUsage(action) {
  await supabase
    .from('account_usage')
    .update({ [action]: supabase.sql`+1` })
    .eq('user_id', auth.uid());
}

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://tyxjiyttkkpicmxzwjhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5eGppeXR0a2twaWNteHp3amhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzY5MDAsImV4cCI6MjA4MTU1MjkwMH0.d2Fkb6hyk3ry88cEke1ymdi22bOSH6wC3a7aILtx5x8';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

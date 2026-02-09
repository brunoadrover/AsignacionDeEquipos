import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsakbdlxprtieesqbrrj.supabase.co';
const supabaseKey = 'sb_publishable_ZXeQN_cPKfrKGVoWEVi0Wg_sgY7RjRn';

export const supabase = createClient(supabaseUrl, supabaseKey);
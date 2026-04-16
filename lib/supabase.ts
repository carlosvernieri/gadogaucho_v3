import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para uso no Browser (Frontend)
export const createClientBrowser = () => 
  createBrowserClient(supabaseUrl, supabaseAnonKey);

// Cliente Singleton para compatibilidade com código legado que importa { supabase }
export const supabase = createClientBrowser();

// Cliente Admin para operações que precisam ignorar RLS (Backend)
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.');
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export const supabaseAdmin = getSupabaseAdmin();
export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;


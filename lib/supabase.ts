import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para uso no Browser (Frontend)
export const createClientBrowser = () => 
  createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    }
  });

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

let cachedAdminClient: any = null;
let isAnonCached = true;

export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop, receiver) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!cachedAdminClient || (isAnonCached && serviceRoleKey)) {
      cachedAdminClient = getSupabaseAdmin();
      isAnonCached = !serviceRoleKey;
    }
    
    const value = Reflect.get(cachedAdminClient, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(cachedAdminClient);
    }
    return value;
  }
});

export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;


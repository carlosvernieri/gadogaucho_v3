import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

// Lazy initialization to prevent crashes on startup
let supabaseClient: ReturnType<typeof createClient> | null = null;
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase config missing:', { url: !!supabaseUrl, key: !!supabaseAnonKey });
    throw new Error('Supabase environment variables are missing. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      console.log('Supabase client initialized');
    } catch (e) {
      console.error('Failed to create Supabase client:', e);
      throw e;
    }
  }
  return supabaseClient;
};

// Export a proxy or a getter-based object to maintain compatibility with existing code
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    const client = getSupabase();
    return (client as any)[prop];
  }
});

// For server-side operations that need bypass RLS
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    // Fallback to anon key if service role is missing, but log a warning
    if (!supabaseUrl) {
      throw new Error('Supabase URL is missing.');
    }
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to anon key for admin operations.');
    return getSupabase();
  }

  if (!supabaseAdminClient) {
    try {
      supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);
      console.log('Supabase admin client initialized');
    } catch (e) {
      console.error('Failed to create Supabase admin client:', e);
      throw e;
    }
  }
  return supabaseAdminClient;
};

// Export a system client that automatically uses the best available key
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    const client = getSupabaseAdmin();
    return (client as any)[prop];
  }
});

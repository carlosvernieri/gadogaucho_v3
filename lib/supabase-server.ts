import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para uso exclusivo no Servidor (API Routes / Server Actions)
export const createClientServer = async (onCookieSet?: (name: string, value: string, options: any) => void) => {
  const cookieStore = await cookies();
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
            };
            cookieStore.set(name, value, finalOptions);
            if (onCookieSet) {
              onCookieSet(name, value, finalOptions);
            }
          });
        } catch {
          // O método setAll pode ser chamado de Server Components, 
          // onde os cookies não podem ser modificados. Ignoramos o erro.
        }
      },
    },
  });
};

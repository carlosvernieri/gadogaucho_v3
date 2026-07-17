import { createClientServer } from './supabase-server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * Obtém a sessão do usuário autenticado de forma robusta.
 * 
 * Estratégia de fallback em 2 camadas:
 * 1. Tenta obter sessão via cookies HTTP (padrão do Supabase SSR).
 *    Funciona após login quando cookies são definidos corretamente.
 * 2. Se falhar, tenta extrair o token Bearer do header Authorization.
 *    Isso permite que o frontend passe o token explicitamente como fallback.
 */
export async function getSession() {
  // Camada 1: Sessão via cookies HTTP (método padrão)
  try {
    const supabase = await createClientServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (user && !error) {
      return {
        id: user.id,
        email: user.email,
        is_admin: user.user_metadata?.is_admin || false
      };
    }
  } catch (error) {
    // Silently continue to fallback
  }

  // Camada 2: Token Bearer no header Authorization (fallback robusto)
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      // Cria um cliente temporário apenas para validar o token
      const tempClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error } = await tempClient.auth.getUser(accessToken);
      
      if (user && !error) {
        return {
          id: user.id,
          email: user.email,
          is_admin: user.user_metadata?.is_admin || false
        };
      }
    }
  } catch (error) {
    // Token inválido ou expirado
  }

  return null;
}

// Funções legadas que não são mais necessárias mas exportadas para evitar erros de importação
export async function signToken() { return ''; }
export async function verifyToken() { return null; }
export async function setSessionCookie() {}
export async function clearSessionCookie() {}

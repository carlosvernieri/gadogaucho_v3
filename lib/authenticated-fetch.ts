import { supabase } from './supabase';

/**
 * Wrapper para fetch que automaticamente inclui o token de autenticação
 * Supabase como Bearer token no header Authorization.
 * 
 * Isso garante que as API routes sempre recebam o token de autenticação,
 * mesmo quando os cookies HTTP ainda não foram propagados (race condition
 * após login) ou quando o browser perdeu os cookies (refresh agressivo).
 * 
 * Uso: substituir `fetch('/api/simulations')` por `authenticatedFetch('/api/simulations')`
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  
  // Tenta obter o token de acesso da sessão Supabase do browser
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  } catch (error) {
    // Se não conseguir obter a sessão, faz a requisição sem o token
    // Os cookies HTTP servirão como fallback
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

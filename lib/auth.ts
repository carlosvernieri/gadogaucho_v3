import { createClientServer } from './supabase-server';

/**
 * Função de compatibilidade para manter as rotas de API funcionando
 * sem precisar refatorar todos os arquivos individualmente.
 */
export async function getSession() {
  try {
    const supabase = await createClientServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    // Mapeia o formato do novo 'user' para o formato antigo do payload JWT
    // que o restante do sistema espera.
    return {
      id: user.id,
      email: user.email,
      is_admin: user.user_metadata?.is_admin || false
    };
  } catch (error) {
    console.error('Error in bridge getSession:', error);
    return null;
  }
}

// Funções legadas que não são mais necessárias mas exportadas para evitar erros de importação
export async function signToken() { return ''; }
export async function verifyToken() { return null; }
export async function setSessionCookie() {}
export async function clearSessionCookie() {}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: Isso garante que a sessão seja atualizada e o cookie renovado.
  // Refresh do token acontece aqui automaticamente se necessário.
  try {
    const { error } = await supabase.auth.getUser()
    if (error) {
      // Não spamma o terminal com aviso para requisições de usuários não autenticados normais ou erros de refresh token
      const isNormalOrTokenError = 
        error.message === 'Auth session missing!' || 
        error.message?.toLowerCase().includes('refresh token') || 
        error.message?.toLowerCase().includes('refresh_token') ||
        error.status === 400;

      if (!isNormalOrTokenError) {
        console.warn('Middleware session update warning:', error.message);
      }
      // Se for um erro de token expirado ou inválido, limpamos os cookies para evitar loops de erro.
      if (
        error.message?.toLowerCase().includes('refresh token') || 
        error.message?.toLowerCase().includes('refresh_token') || 
        error.status === 400
      ) {
        clearAuthCookies(request, supabaseResponse)
      }
    }
  } catch (error: any) {
    const isTokenError = 
      error.message?.toLowerCase().includes('refresh token') || 
      error.message?.toLowerCase().includes('refresh_token');
      
    if (!isTokenError) {
      console.error('Error refreshing session in middleware:', error)
    }
    clearAuthCookies(request, supabaseResponse)
  }

  return supabaseResponse
}

function clearAuthCookies(request: NextRequest, response: NextResponse) {
  try {
    const allCookies = request.cookies.getAll()
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')) {
        response.cookies.delete(cookie.name)
      }
    })
  } catch (cookieError) {
    console.error('Error clearing cookies in middleware:', cookieError)
  }
}

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

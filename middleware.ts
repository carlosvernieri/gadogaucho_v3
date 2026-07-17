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
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
            };
            supabaseResponse.cookies.set(name, value, finalOptions)
          })
        },
      },
    }
  )

  // IMPORTANTE: Isso garante que a sessão seja atualizada e o cookie renovado.
  // Refresh do token acontece aqui automaticamente se necessário.
  try {
    const { error } = await supabase.auth.getUser()
    if (error) {
      // 'Auth session missing!' é normal para usuários não autenticados — não logar, não limpar.
      if (error.message === 'Auth session missing!') {
        // Sem sessão, sem problema — usuário simplesmente não está logado.
      } else {
        // Apenas limpar cookies em caso de refresh token DEFINITIVAMENTE inválido ou já utilizado.
        // Não limpar em erros transientes (status 400 genérico pode ser retornado durante renovação normal).
        const isDefinitivelyInvalidToken =
          error.message?.toLowerCase().includes('invalid refresh token') ||
          error.message?.toLowerCase().includes('refresh token already used') ||
          error.message?.toLowerCase().includes('token has expired');

        if (isDefinitivelyInvalidToken) {
          console.warn('Middleware: token inválido definitivo, limpando cookies:', error.message);
          clearAuthCookies(request, supabaseResponse);
        } else {
          // Log de outros erros inesperados sem limpar os cookies
          console.warn('Middleware session update warning:', error.message);
        }
      }
    }
  } catch (error: any) {
    // Em exceções inesperadas, só limpar se for definitivamente um erro de token inválido
    const isDefinitivelyInvalidToken =
      error.message?.toLowerCase().includes('invalid refresh token') ||
      error.message?.toLowerCase().includes('refresh token already used') ||
      error.message?.toLowerCase().includes('token has expired');

    if (isDefinitivelyInvalidToken) {
      clearAuthCookies(request, supabaseResponse);
    } else {
      console.error('Error refreshing session in middleware:', error);
    }
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

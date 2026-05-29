import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /api/draft?secret=XXX
 * Ativa o Draft Mode (bypass de ISR) para o usuário admin atual.
 * Valida: (1) secret correto, (2) usuário autenticado como admin no Supabase.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');

  // 1. Verifica o secret
  if (!secret || secret !== process.env.DRAFT_MODE_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Verifica que o usuário é admin via sessão Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized: not authenticated', { status: 401 });
  }

  // 3. Verifica role admin na tabela users
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return new NextResponse('Forbidden: admin only', { status: 403 });
  }

  // 4. Ativa o Draft Mode (seta o cookie __prerender_bypass)
  const draft = await draftMode();
  draft.enable();

  return new NextResponse(JSON.stringify({ draftMode: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * DELETE /api/draft
 * Desativa o Draft Mode (restaura ISR normal).
 */
export async function DELETE() {
  const draft = await draftMode();
  draft.disable();

  return new NextResponse(JSON.stringify({ draftMode: false }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createClientServer } from '@/lib/supabase-server';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json({ error: 'O e-mail é obrigatório.' }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    const supabase = await createClientServer();

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/redefinir-senha`,
    });

    if (error) {
      console.error('Reset password error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    return NextResponse.json({ error: 'Erro interno de servidor' }, { status: 500 });
  }
}

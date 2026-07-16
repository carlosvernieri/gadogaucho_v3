import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createClientServer } from '@/lib/supabase-server';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, email, password, city, phone } = body;

    const rawPhone = phone ? phone.replace(/\D/g, '') : '';
    if (rawPhone.length !== 11) {
      return NextResponse.json({ error: 'Telefone inválido. Utilize o formato (xx) xxxx xxxxx' }, { status: 400 });
    }

    const supabase = await createClientServer();

    // O Supabase Auth cuidará de verificar se o usuário existe e de hashear a senha.
    // Enviamos os dados extras no 'options.data' para que o Trigger SQL os pegue.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          city,
          phone
        }
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
    }

    const response = NextResponse.json({
      id: authData.user.id,
      email: authData.user.email,
      name: authData.user.user_metadata?.name || name
    });

    // Copiar cookies do cookieStore para a resposta para garantir que sejam enviados ao navegador
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      response.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        expires: cookie.expires,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
      });
    }

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}


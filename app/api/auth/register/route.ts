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

    const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];
    const supabase = await createClientServer((name, value, options) => {
      cookiesToSet.push({ name, value, options });
    });

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

    // Copiar cookies capturados do fluxo de autenticação para a resposta
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}


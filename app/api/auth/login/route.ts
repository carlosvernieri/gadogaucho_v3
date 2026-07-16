import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { createClientServer } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];
    const supabase = await createClientServer((name, value, options) => {
      cookiesToSet.push({ name, value, options });
    });

    // 1. Tentar autenticação nativa do Supabase
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 2. Se falhar, verificar se é um usuário legado (Migração Preguiçosa)
    if (authError) {
      console.log('Login nativo falhou, verificando legado para:', email);
      
      const { data: legacyUser, error: legacyError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (legacyUser && legacyUser.password) {
        // Se a senha começar com $2 é um hash bcrypt, se não comparamos direto (caso de senhas simples legado como o admin)
        const isPasswordValid = legacyUser.password.startsWith('$2') 
          ? await bcrypt.compare(password, legacyUser.password)
          : (password === legacyUser.password);
        
        if (isPasswordValid) {
          console.log('Usuário legado identificado. Migrando:', email);
          
          // Criar o usuário no Supabase Auth para migrá-lo
          // O Trigger SQL cuidará de atualizar o ID na tabela public.users
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              name: legacyUser.name,
              city: legacyUser.city,
              phone: legacyUser.phone,
              is_admin: !!legacyUser.is_admin
            }
          });

          if (createError) {
            console.error('Erro ao migrar usuário para Supabase Auth:', createError.message);
            // Se o erro for que o usuário já existe, tentamos logar de novo (pode ser problema de sincronismo)
            if (createError.message.includes('already exists')) {
              const retry = await supabase.auth.signInWithPassword({ email, password });
              authData = retry.data;
              authError = retry.error;
            }
          } else {
            console.log('Usuário migrado com sucesso. Tentando login final...');
            const retry = await supabase.auth.signInWithPassword({ email, password });
            authData = retry.data;
            authError = retry.error;
          }
        }
      }
    }

    if (authError || !authData?.user) {
      const message = authError?.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos' 
        : (authError?.message || 'E-mail ou senha incorretos');
      
      console.log('Login falhou com erro:', message);
      return NextResponse.json({ error: message }, { status: 401 });
    }

    console.log('Login bem sucedido para:', email);

    const response = NextResponse.json({
      id: authData.user.id,
      email: authData.user.email,
      name: authData.user.user_metadata?.name || 'Usuário',
      is_admin: authData.user.user_metadata?.is_admin || false,
      // Incluir tokens para o browser poder sincronizar a sessão via setSession()
      _session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at,
      }
    });

    // Copiar cookies capturados do fluxo de autenticação para a resposta
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;

  } catch (error: any) {
    console.error('ERRO CRÍTICO NO LOGIN:', error);
    return NextResponse.json({ 
      error: 'Erro interno no servidor',
      details: error.message 
    }, { status: 500 });
  }
}

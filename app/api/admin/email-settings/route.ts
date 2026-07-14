import { NextResponse } from 'next/server';
import { getAdminEmailSettings, saveAdminEmailSettings } from '@/lib/alert-settings';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Retornar as configurações de e-mail do admin
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas admins podem ver essas configurações de e-mail
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', session.id)
      .maybeSingle();

    if (profileError || !userProfile?.is_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const settings = await getAdminEmailSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error in GET /api/admin/email-settings:', error);
    return NextResponse.json({ error: 'Erro ao carregar configurações de e-mail' }, { status: 500 });
  }
}

// POST: Alterar o e-mail do admin (restrito a administradores)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar privilégios de administrador
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', session.id)
      .maybeSingle();

    if (profileError || !userProfile?.is_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    const success = await saveAdminEmailSettings({ email: email.trim() });

    if (!success) {
      return NextResponse.json({ error: 'Falha ao salvar configurações de e-mail' }, { status: 500 });
    }

    return NextResponse.json({ success: true, email: email.trim() });
  } catch (error: any) {
    console.error('Error in POST /api/admin/email-settings:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

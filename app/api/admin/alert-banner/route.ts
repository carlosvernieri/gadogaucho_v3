import { NextResponse } from 'next/server';
import { getAlertBannerSettings, saveAlertBannerSettings } from '@/lib/alert-settings';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Retornar as configurações atuais do banner (público)
export async function GET() {
  try {
    const settings = await getAlertBannerSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error in GET /api/admin/alert-banner:', error);
    return NextResponse.json({ error: 'Erro ao carregar configurações do banner' }, { status: 500 });
  }
}

// POST: Alterar as configurações do banner (restrito a administradores)
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

    const body = await request.json();
    const { enabled, title, description, buttonText } = body;

    if (typeof enabled !== 'boolean' || !title || !description || !buttonText) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const success = await saveAlertBannerSettings({
      enabled,
      title: title.trim(),
      description: description.trim(),
      buttonText: buttonText.trim()
    });

    if (!success) {
      return NextResponse.json({ error: 'Falha ao salvar configurações do banner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, enabled, title, description, buttonText });
  } catch (error: any) {
    console.error('Error in POST /api/admin/alert-banner:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

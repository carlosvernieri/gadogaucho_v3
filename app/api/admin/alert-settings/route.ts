import { NextResponse } from 'next/server';
import { getAlertSettings, saveAlertSettings } from '@/lib/alert-settings';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Retornar as configurações atuais (acessível para autenticados)
export async function GET() {
  try {
    const settings = await getAlertSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error in GET /api/admin/alert-settings:', error);
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
  }
}

// POST: Alterar as configurações (restrito a administradores)
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

    const { paused, maxDistance } = await request.json();
    
    const parsedMaxDistance = typeof maxDistance === 'number' ? maxDistance : Number(maxDistance || 100);
    if (isNaN(parsedMaxDistance) || parsedMaxDistance <= 0) {
      return NextResponse.json({ error: 'Distância máxima deve ser um número positivo' }, { status: 400 });
    }

    const success = await saveAlertSettings({ 
      paused: !!paused, 
      maxDistance: parsedMaxDistance 
    });

    if (!success) {
      return NextResponse.json({ error: 'Falha ao salvar configurações' }, { status: 500 });
    }

    return NextResponse.json({ success: true, paused: !!paused, maxDistance: parsedMaxDistance });
  } catch (error: any) {
    console.error('Error in POST /api/admin/alert-settings:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

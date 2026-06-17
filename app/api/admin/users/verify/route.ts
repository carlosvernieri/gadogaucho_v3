import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Ação inválida. Use "approve" ou "reject".' }, { status: 400 });
    }

    if (action === 'reject' && (!reason || typeof reason !== 'string' || reason.trim() === '')) {
      return NextResponse.json({ error: 'O motivo da rejeição é obrigatório ao rejeitar uma solicitação.' }, { status: 400 });
    }

    let updates: any = {};
    if (action === 'approve') {
      updates = {
        verified: true,
        verification_status: 'verified',
        verification_rejected_reason: null
      };
    } else {
      updates = {
        verified: false,
        verification_status: 'rejected',
        verification_rejected_reason: reason
      };
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, phone, city, is_admin, verified, verification_status, verification_document_url, verification_selfie_url, verification_rejected_reason')
      .single();

    if (error) {
      console.error('Error verifying user:', error);
      return NextResponse.json({ error: 'Erro ao atualizar status do usuário no banco de dados' }, { status: 500 });
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Admin verify user error:', error);
    return NextResponse.json({ error: 'Erro interno de servidor' }, { status: 500 });
  }
}

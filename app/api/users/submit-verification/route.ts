import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
    }

    const body = await request.json();
    const { documentUrl, selfieUrl } = body;

    if (!documentUrl || typeof documentUrl !== 'string') {
      return NextResponse.json({ error: 'A foto do documento é obrigatória.' }, { status: 400 });
    }

    if (!selfieUrl || typeof selfieUrl !== 'string') {
      return NextResponse.json({ error: 'A foto de selfie é obrigatória.' }, { status: 400 });
    }

    // Atualizar o status de verificação do usuário no banco usando cliente Admin
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({
        verification_status: 'pending',
        verification_document_url: documentUrl,
        verification_selfie_url: selfieUrl,
        verification_rejected_reason: null // Reseta o motivo da rejeição anterior se houver
      })
      .eq('id', session.id)
      .select('id, name, email, phone, city, is_admin, verified, verification_status, verification_document_url, verification_selfie_url, verification_rejected_reason')
      .single();

    if (error) {
      console.error('Error submitting user verification documents:', error);
      return NextResponse.json({ error: 'Erro ao salvar os dados de verificação no banco de dados' }, { status: 500 });
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Submit user verification error:', error);
    return NextResponse.json({ error: 'Erro interno de servidor' }, { status: 500 });
  }
}

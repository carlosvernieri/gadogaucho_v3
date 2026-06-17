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

    // Nota: Em produção, validaríamos a transação com a API do PayPal
    // ex: const body = await request.json(); const orderId = body.orderId;
    // const paymentValid = await verifyPayPalPayment(orderId);

    // Atualizar o status do usuário para verificado usando o cliente Admin (bypassa RLS)
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({ verified: true })
      .eq('id', session.id)
      .select('id, name, email, phone, city, is_admin, verified')
      .single();

    if (error) {
      console.error('Error updating user verification:', error);
      return NextResponse.json({ error: 'Erro ao ativar o selo verificado no banco de dados' }, { status: 500 });
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Verify user error:', error);
    return NextResponse.json({ error: 'Erro interno de servidor' }, { status: 500 });
  }
}

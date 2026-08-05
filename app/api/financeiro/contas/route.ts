import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 503 });
  }
  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { data: contas, error } = await (supabaseAdmin
      .from('contas_bancarias') as any)
      .select('*')
      .eq('user_id', session.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(contas || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 503 });
  }
  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { banco_nome, agencia, conta_numero, tipo_conta } = body;

    if (!banco_nome || !agencia || !conta_numero) {
      return NextResponse.json({ error: 'Banco, agência e número de conta são obrigatórios' }, { status: 400 });
    }

    const { data: conta, error } = await (supabaseAdmin
      .from('contas_bancarias') as any)
      .insert([{
        user_id: session.id,
        banco_nome,
        agencia,
        conta_numero,
        tipo_conta: tipo_conta || 'Corrente',
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(conta, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 503 });
  }
  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, banco_nome, agencia, conta_numero, tipo_conta } = body;

    if (!id || !banco_nome || !agencia || !conta_numero) {
      return NextResponse.json({ error: 'ID, Banco, agência e número de conta são obrigatórios' }, { status: 400 });
    }

    const { data: conta, error } = await (supabaseAdmin
      .from('contas_bancarias') as any)
      .update({
        banco_nome,
        agencia,
        conta_numero,
        tipo_conta: tipo_conta || 'Corrente',
      })
      .eq('id', id)
      .eq('user_id', session.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(conta);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 503 });
  }
  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID da conta não fornecido' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin
      .from('contas_bancarias') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', session.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

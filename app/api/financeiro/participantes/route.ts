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
    const { data: participantes, error } = await (supabaseAdmin
      .from('participantes') as any)
      .select('*')
      .eq('user_id', session.id)
      .order('nome', { ascending: true });

    if (error) throw error;
    return NextResponse.json(participantes || []);
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
    const { nome, cpf_cnpj, inscricao_estadual } = body;

    if (!nome || !cpf_cnpj) {
      return NextResponse.json({ error: 'Nome e CPF/CNPJ são obrigatórios' }, { status: 400 });
    }

    const { data: participante, error } = await (supabaseAdmin
      .from('participantes') as any)
      .insert([{
        user_id: session.id,
        nome,
        cpf_cnpj,
        inscricao_estadual: inscricao_estadual || '',
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(participante, { status: 201 });
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
    const { id, nome, cpf_cnpj, inscricao_estadual } = body;

    if (!id || !nome || !cpf_cnpj) {
      return NextResponse.json({ error: 'ID, Nome e CPF/CNPJ são obrigatórios' }, { status: 400 });
    }

    const { data: participante, error } = await (supabaseAdmin
      .from('participantes') as any)
      .update({
        nome,
        cpf_cnpj,
        inscricao_estadual: inscricao_estadual || '',
      })
      .eq('id', id)
      .eq('user_id', session.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(participante);
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
      return NextResponse.json({ error: 'ID do participante não fornecido' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin
      .from('participantes') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', session.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

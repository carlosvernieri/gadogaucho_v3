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
    const { data: fazendas, error } = await (supabaseAdmin
      .from('fazendas') as any)
      .select('*, parcerias_imoveis(*)')
      .eq('user_id', session.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(fazendas || []);
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
    const { nome, nirf_cafir, incra, area_total, parcerias } = body;

    if (!nome || !nirf_cafir) {
      return NextResponse.json({ error: 'Nome e NIRF/CAFIR são obrigatórios' }, { status: 400 });
    }

    const { data: fazenda, error: fazendaError } = await (supabaseAdmin
      .from('fazendas') as any)
      .insert([{
        user_id: session.id,
        nome,
        nirf_cafir,
        incra: incra || '',
        area_total: parseFloat(area_total || 0),
      }])
      .select()
      .single();

    if (fazendaError) throw fazendaError;

    if (parcerias && Array.isArray(parcerias) && parcerias.length > 0) {
      const parceriasPayload = parcerias.map((p: any) => ({
        fazenda_id: fazenda.id,
        nome_socio: p.nome_socio,
        cpf_socio: p.cpf_socio,
        percentual_participacao: parseFloat(p.percentual_participacao || 0),
      }));

      const { error: parceriasError } = await (supabaseAdmin
        .from('parcerias_imoveis') as any)
        .insert(parceriasPayload);

      if (parceriasError) throw parceriasError;
    }

    return NextResponse.json(fazenda, { status: 201 });
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
    const { id, nome, nirf_cafir, incra, area_total, parcerias } = body;

    if (!id || !nome || !nirf_cafir) {
      return NextResponse.json({ error: 'ID, Nome e NIRF/CAFIR são obrigatórios' }, { status: 400 });
    }

    const { data: fazenda, error: fazendaError } = await (supabaseAdmin
      .from('fazendas') as any)
      .update({
        nome,
        nirf_cafir,
        incra: incra || '',
        area_total: parseFloat(area_total || 0),
      })
      .eq('id', id)
      .eq('user_id', session.id)
      .select()
      .single();

    if (fazendaError) throw fazendaError;

    // Refresh parcerias
    await (supabaseAdmin
      .from('parcerias_imoveis') as any)
      .delete()
      .eq('fazenda_id', id);

    if (parcerias && Array.isArray(parcerias) && parcerias.length > 0) {
      const parceriasPayload = parcerias.map((p: any) => ({
        fazenda_id: id,
        nome_socio: p.nome_socio,
        cpf_socio: p.cpf_socio,
        percentual_participacao: parseFloat(p.percentual_participacao || 0),
      }));

      const { error: parceriasError } = await (supabaseAdmin
        .from('parcerias_imoveis') as any)
        .insert(parceriasPayload);

      if (parceriasError) throw parceriasError;
    }

    return NextResponse.json(fazenda);
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
      return NextResponse.json({ error: 'ID da fazenda não fornecido' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin
      .from('fazendas') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', session.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

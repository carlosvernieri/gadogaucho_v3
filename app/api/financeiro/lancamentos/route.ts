import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 503 });
  }
  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fazendaId = searchParams.get('fazenda_id');
    const tipo = searchParams.get('tipo');

    let query = (supabaseAdmin.from('lancamentos') as any)
      .select('*, fazendas!inner(user_id, nome, nirf_cafir), contas_bancarias(banco_nome, agencia, conta_numero), participantes(nome, cpf_cnpj), lancamento_itens(*)')
      .eq('fazendas.user_id', session.id)
      .order('data_pagamento', { ascending: false });

    if (fazendaId) {
      query = query.eq('fazenda_id', fazendaId);
    }
    if (tipo) {
      query = query.eq('tipo_movimento', tipo.toUpperCase());
    }

    const { data: lancamentos, error } = await query;

    if (error) throw error;
    return NextResponse.json(lancamentos || []);
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
    const {
      fazenda_id,
      conta_id,
      participante_id,
      data_pagamento,
      tipo_movimento,
      classificacao,
      valor,
      numero_documento,
      observacoes,
      itens,
    } = body;

    if (!fazenda_id || !conta_id || !data_pagamento || !tipo_movimento || !valor || !numero_documento) {
      return NextResponse.json({ error: 'Fazenda, conta bancária, data, tipo, valor e nº do documento são obrigatórios' }, { status: 400 });
    }

    // Verify fazenda belongs to user
    const { data: fazenda, error: fazendaError } = await (supabaseAdmin
      .from('fazendas') as any)
      .select('id')
      .eq('id', fazenda_id)
      .eq('user_id', session.id)
      .single();

    if (fazendaError || !fazenda) {
      return NextResponse.json({ error: 'Fazenda inválida ou não pertencente ao usuário' }, { status: 403 });
    }

    const { data: lancamento, error: lancamentoError } = await (supabaseAdmin
      .from('lancamentos') as any)
      .insert([{
        fazenda_id,
        conta_id,
        participante_id: participante_id || null,
        data_pagamento,
        tipo_movimento: tipo_movimento.toUpperCase(),
        classificacao: classificacao || 'Geral',
        valor: parseFloat(valor),
        numero_documento,
        observacoes: observacoes || '',
      }])
      .select()
      .single();

    if (lancamentoError) throw lancamentoError;

    // Insert items if provided and auto-sync to Almoxarifado (Stock)
    if (itens && Array.isArray(itens) && itens.length > 0) {
      const itensPayload = itens.map((item: any) => ({
        lancamento_id: lancamento.id,
        descricao: item.descricao,
        quantidade: parseFloat(item.quantidade || 1),
        valor_unitario: parseFloat(item.valor_unitario || item.valor_total || 0),
        valor_total: parseFloat(item.valor_total || 0),
        classificacao_item: item.classificacao_item || classificacao || 'Geral',
        unidade: item.unidade || 'UN',
      }));

      const { error: itensError } = await (supabaseAdmin
        .from('lancamento_itens') as any)
        .insert(itensPayload.map(({ unidade, ...rest }) => rest));

      if (itensError) throw itensError;

      // Synchronize items with Almoxarifado / Stock
      for (const item of itensPayload) {
        try {
          const itemQtd = item.quantidade;
          const itemValorUnit = item.valor_unitario;
          const itemCat = item.classificacao_item || 'Geral';

          // Search existing product by name & user_id
          const { data: existingProd } = await (supabaseAdmin
            .from('almoxarifado_produtos') as any)
            .select('id, quantidade_atual, custo_medio')
            .eq('user_id', session.id)
            .ilike('nome', item.descricao.trim())
            .maybeSingle();

          let prodId = existingProd?.id;

          if (existingProd) {
            const newQtd = (existingProd.quantidade_atual || 0) + itemQtd;
            await (supabaseAdmin
              .from('almoxarifado_produtos') as any)
              .update({
                quantidade_atual: newQtd,
                custo_medio: itemValorUnit || existingProd.custo_medio || 0
              })
              .eq('id', existingProd.id);
          } else {
            const { data: newProd } = await (supabaseAdmin
              .from('almoxarifado_produtos') as any)
              .insert([{
                user_id: session.id,
                nome: item.descricao,
                categoria: itemCat,
                quantidade_atual: itemQtd,
                unidade_medida: item.unidade || 'UN',
                custo_medio: itemValorUnit,
              }])
              .select()
              .single();
              
            prodId = newProd?.id;
          }

          if (prodId) {
            await (supabaseAdmin
              .from('almoxarifado_movimentacoes') as any)
              .insert([{
                produto_id: prodId,
                tipo_movimentacao: 'ENTRADA',
                quantidade: itemQtd,
                observacoes: `Entrada Automática via NF-e Doc: ${numero_documento}`
              }]);
          }
        } catch (syncErr) {
          console.warn('Erro ao sincronizar item no almoxarifado:', syncErr);
        }
      }
    }

    return NextResponse.json(lancamento, { status: 201 });
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
    const {
      id,
      fazenda_id,
      conta_id,
      participante_id,
      data_pagamento,
      tipo_movimento,
      classificacao,
      valor,
      numero_documento,
      observacoes,
      itens,
    } = body;

    if (!id || !fazenda_id || !conta_id || !data_pagamento || !tipo_movimento || !valor || !numero_documento) {
      return NextResponse.json({ error: 'ID do lançamento, Fazenda, conta bancária, data, tipo, valor e nº do documento são obrigatórios' }, { status: 400 });
    }

    // Verify fazenda belongs to user
    const { data: fazenda, error: fazendaError } = await (supabaseAdmin
      .from('fazendas') as any)
      .select('id')
      .eq('id', fazenda_id)
      .eq('user_id', session.id)
      .single();

    if (fazendaError || !fazenda) {
      return NextResponse.json({ error: 'Fazenda inválida ou não pertencente ao usuário' }, { status: 403 });
    }

    const { data: lancamento, error: lancamentoError } = await (supabaseAdmin
      .from('lancamentos') as any)
      .update({
        fazenda_id,
        conta_id,
        participante_id: participante_id || null,
        data_pagamento,
        tipo_movimento: tipo_movimento.toUpperCase(),
        classificacao: classificacao || 'Geral',
        valor: parseFloat(valor),
        numero_documento,
        observacoes: observacoes || '',
      })
      .eq('id', id)
      .select()
      .single();

    if (lancamentoError) throw lancamentoError;

    // Replace items if provided
    if (itens && Array.isArray(itens)) {
      await (supabaseAdmin.from('lancamento_itens') as any)
        .delete()
        .eq('lancamento_id', id);

      if (itens.length > 0) {
        const itensPayload = itens.map((item: any) => ({
          lancamento_id: id,
          descricao: item.descricao,
          quantidade: parseFloat(item.quantidade || 1),
          valor_unitario: parseFloat(item.valor_unitario || item.valor_total || 0),
          valor_total: parseFloat(item.valor_total || 0),
          classificacao_item: item.classificacao_item || classificacao || 'Geral',
        }));

        await (supabaseAdmin.from('lancamento_itens') as any)
          .insert(itensPayload);
      }
    }

    return NextResponse.json(lancamento);
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
      return NextResponse.json({ error: 'ID do lançamento não fornecido' }, { status: 400 });
    }

    // Verify the lancamento belongs to a fazenda owned by the user
    const { data: lancamento, error: fetchError } = await (supabaseAdmin
      .from('lancamentos') as any)
      .select('id, fazenda_id, fazendas!inner(user_id)')
      .eq('id', id)
      .eq('fazendas.user_id', session.id)
      .single();

    if (fetchError || !lancamento) {
      return NextResponse.json({ error: 'Lançamento não encontrado ou não pertence ao usuário' }, { status: 403 });
    }

    const { error } = await (supabaseAdmin
      .from('lancamentos') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

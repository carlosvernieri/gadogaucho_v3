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
    const { data: produtos, error: prodError } = await (supabaseAdmin
      .from('almoxarifado_produtos') as any)
      .select('*, almoxarifado_movimentacoes(*)')
      .eq('user_id', session.id)
      .order('nome', { ascending: true });

    if (prodError) throw prodError;

    return NextResponse.json(produtos || []);
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
    const { action, produto_id, tipo_movimentacao, quantidade, observacoes, nome, categoria, unidade_medida, custo_medio } = body;

    // Action 1: Stock Movement (Baixa / Entrada)
    if (action === 'movement' || (tipo_movimentacao && produto_id)) {
      if (!produto_id || !quantidade || !tipo_movimentacao) {
        return NextResponse.json({ error: 'Produto, quantidade e tipo de movimentação são obrigatórios' }, { status: 400 });
      }

      const qtdNum = parseFloat(quantidade);
      if (isNaN(qtdNum) || qtdNum <= 0) {
        return NextResponse.json({ error: 'Quantidade deve ser maior que zero' }, { status: 400 });
      }

      // Fetch current product quantity
      const { data: currentProd, error: fetchErr } = await (supabaseAdmin
        .from('almoxarifado_produtos') as any)
        .select('*')
        .eq('id', produto_id)
        .single();

      if (fetchErr || !currentProd) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 44 });
      }

      const currentQtd = parseFloat(currentProd.quantidade_atual || 0);
      let newQtd = currentQtd;

      if (tipo_movimentacao === 'SAIDA') {
        newQtd = Math.max(0, currentQtd - qtdNum);
      } else {
        newQtd = currentQtd + qtdNum;
      }

      // Update product quantity
      const { error: updateErr } = await (supabaseAdmin
        .from('almoxarifado_produtos') as any)
        .update({ quantidade_atual: newQtd })
        .eq('id', produto_id);

      if (updateErr) throw updateErr;

      // Insert movement record
      const { data: movimentacao, error: movErr } = await (supabaseAdmin
        .from('almoxarifado_movimentacoes') as any)
        .insert([{
          produto_id,
          tipo_movimentacao,
          quantidade: qtdNum,
          observacoes: observacoes || (tipo_movimentacao === 'SAIDA' ? 'Baixa de estoque' : 'Entrada de estoque')
        }])
        .select()
        .single();

      if (movErr) throw movErr;

      return NextResponse.json({ success: true, movimentacao, nova_quantidade: newQtd }, { status: 201 });
    }

    // Action 2: Create new product
    if (!nome) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 });
    }

    const { data: produto, error: prodErr } = await (supabaseAdmin
      .from('almoxarifado_produtos') as any)
      .insert([{
        user_id: session.id,
        nome,
        categoria: categoria || 'Geral',
        unidade_medida: unidade_medida || 'UN',
        quantidade_atual: parseFloat(quantidade || 0),
        custo_medio: parseFloat(custo_medio || 0)
      }])
      .select()
      .single();

    if (prodErr) throw prodErr;

    return NextResponse.json(produto, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

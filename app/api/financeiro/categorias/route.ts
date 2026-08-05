import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Categorias padrão para novos usuários — compatíveis com dados existentes
// (hardcoded no LancamentosTab + inferidas pelo xml-import)
const DEFAULT_CATEGORIAS = [
  // Receitas
  { nome: 'Venda de Rebanho', tipo: 'RECEITA', ordem: 1 },
  { nome: 'Outras Receitas', tipo: 'RECEITA', ordem: 2 },
  // Despesas
  { nome: 'Insumos', tipo: 'DESPESA', ordem: 10 },
  { nome: 'Suplemento / Sal', tipo: 'DESPESA', ordem: 11 },
  { nome: 'Ração / Concentrado', tipo: 'DESPESA', ordem: 12 },
  { nome: 'Sanidade e Vacinas', tipo: 'DESPESA', ordem: 13 },
  { nome: 'Medicamento / Vacina', tipo: 'DESPESA', ordem: 14 },
  { nome: 'Combustíveis e Máquinas', tipo: 'DESPESA', ordem: 15 },
  { nome: 'Combustível', tipo: 'DESPESA', ordem: 16 },
  { nome: 'Manutenção e Pastagem', tipo: 'DESPESA', ordem: 17 },
  { nome: 'Manutenção e Cercas', tipo: 'DESPESA', ordem: 18 },
  { nome: 'Mão de Obra', tipo: 'DESPESA', ordem: 19 },
  { nome: 'Outras Despesas', tipo: 'DESPESA', ordem: 90 },
  { nome: 'Geral', tipo: 'AMBOS', ordem: 99 },
];

async function ensureDefaultCategorias(userId: string) {
  // Check if user already has any categories
  const { data: existing, error: checkErr } = await (supabaseAdmin
    .from('categorias_contabeis') as any)
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (checkErr) {
    console.warn('Erro ao verificar categorias existentes:', checkErr.message);
    return;
  }

  // If user already has categories, skip seeding
  if (existing && existing.length > 0) return;

  // Seed default categories for this user
  const payload = DEFAULT_CATEGORIAS.map(cat => ({
    user_id: userId,
    nome: cat.nome,
    tipo: cat.tipo,
    ordem: cat.ordem,
  }));

  const { error: insertErr } = await (supabaseAdmin
    .from('categorias_contabeis') as any)
    .insert(payload);

  if (insertErr) {
    console.warn('Erro ao criar categorias padrão para o usuário:', insertErr.message);
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    // Fallback: return default categories when Supabase is not configured
    return NextResponse.json(
      DEFAULT_CATEGORIAS.map((c, i) => ({ id: `cat-default-${i}`, ...c }))
    );
  }
  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Ensure default categories exist for first-time users
    await ensureDefaultCategorias(session.id);

    const { data: categorias, error } = await (supabaseAdmin
      .from('categorias_contabeis') as any)
      .select('*')
      .eq('user_id', session.id)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      console.warn('Tabela categorias_contabeis pode não existir ainda:', error.message);
      return NextResponse.json(
        DEFAULT_CATEGORIAS.map((c, i) => ({ id: `cat-default-${i}`, ...c }))
      );
    }

    return NextResponse.json(categorias || []);
  } catch (error: any) {
    return NextResponse.json(
      DEFAULT_CATEGORIAS.map((c, i) => ({ id: `cat-default-${i}`, ...c }))
    );
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
    const { nome, tipo, ordem } = body;

    if (!nome || !tipo) {
      return NextResponse.json({ error: 'Nome e tipo da categoria são obrigatórios' }, { status: 400 });
    }

    if (!['RECEITA', 'DESPESA', 'AMBOS'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo deve ser RECEITA, DESPESA ou AMBOS' }, { status: 400 });
    }

    const { data: categoria, error } = await (supabaseAdmin
      .from('categorias_contabeis') as any)
      .insert([{
        user_id: session.id,
        nome: nome.trim(),
        tipo,
        ordem: ordem || 50,
      }])
      .select()
      .single();

    if (error) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma categoria com esse nome' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(categoria, { status: 201 });
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
    const { id, nome, tipo, ordem } = body;

    if (!id || !nome || !tipo) {
      return NextResponse.json({ error: 'ID, nome e tipo são obrigatórios' }, { status: 400 });
    }

    const { data: categoria, error } = await (supabaseAdmin
      .from('categorias_contabeis') as any)
      .update({
        nome: nome.trim(),
        tipo,
        ordem: ordem || 50,
      })
      .eq('id', id)
      .eq('user_id', session.id)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma categoria com esse nome' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(categoria);
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
      return NextResponse.json({ error: 'ID da categoria não fornecido' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin
      .from('categorias_contabeis') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', session.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

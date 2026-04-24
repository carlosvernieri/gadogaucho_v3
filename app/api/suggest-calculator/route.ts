import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, profession, description } = body;

    if (!name || !phone || !email || !profession || !description) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Nota para o Desenvolvedor: Certifique-se de que a tabela 'calculator_suggestions' 
    // existe no seu banco de dados Supabase com as colunas correspondentes.
    const { data, error } = await (supabaseAdmin
      .from('calculator_suggestions') as any)
      .insert([
        { 
          name, 
          phone, 
          email, 
          profession, 
          description,
          target_email: 'adriano.prog@gmail.com' // Destinatário final
        }
      ])
      .select()
      .single();

    if (error) {
      // Se a tabela não existir, ainda assim vamos registrar o log para o Adriano
      console.log('--- NOVA SUGESTÃO DE CALCULADORA ---');
      console.log('Para:', 'adriano.prog@gmail.com');
      console.log('De:', name, `(${email})`);
      console.log('Fone:', phone);
      console.log('Profissão:', profession);
      console.log('Descrição:', description);
      console.log('------------------------------------');
      
      // Se o erro for "tabela não encontrada", podemos retornar sucesso simulado se 
      // desejado, mas o ideal é avisar que o banco precisa ser configurado.
      // Por ora, vamos lançar o erro para que o dev saiba que precisa criar a tabela.
      throw error;
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Erro ao processar sugestão:', error);
    return NextResponse.json({ 
      error: 'Erro interno ao salvar sugestão. Verifique se a tabela calculator_suggestions existe no banco.' 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const { data, error } = await (supabaseAdmin
      .from('calculator_suggestions') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro ao buscar sugestões:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin
      .from('calculator_suggestions') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar sugestão:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

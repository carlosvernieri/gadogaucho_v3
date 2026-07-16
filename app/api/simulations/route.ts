import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { logToDatabase } from '@/lib/logger';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    await logToDatabase('error', 'GET /api/simulations', 'Supabase is not configured');
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  const session = await getSession();
  if (!session || !session.id) {
    await logToDatabase('warn', 'GET /api/simulations', 'Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.id;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('[DEBUG GET /api/simulations] serviceRoleKey defined:', !!serviceRoleKey);
    console.log('[DEBUG GET /api/simulations] supabaseUrl:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    let query = supabaseAdmin
      .from('saved_simulations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('calculator_type', type);
    }

    const { data: simulations, error } = await query;

    if (error) {
      console.error('[DEBUG GET /api/simulations] query error:', error);
      await logToDatabase('error', 'GET /api/simulations', 'Supabase error fetching simulations', { userId, type, error });
      throw error;
    }

    console.log(`[DEBUG GET /api/simulations] Query returned ${simulations?.length || 0} simulations`);

    await logToDatabase('info', 'GET /api/simulations', `Successfully fetched ${simulations?.length || 0} simulations for user`, { userId, type, count: simulations?.length || 0 });
    return NextResponse.json(simulations);
  } catch (error: any) {
    console.error('Error fetching simulations:', error);
    await logToDatabase('error', 'GET /api/simulations', 'Exception fetching simulations', { userId, type, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    await logToDatabase('error', 'POST /api/simulations', 'Supabase is not configured');
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  let userId: string | null = null;
  try {
    const session = await getSession();
    if (!session || !session.id) {
      await logToDatabase('warn', 'POST /api/simulations', 'Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = session.id;

    const body = await request.json();
    const { name, calculator_type, inputs } = body;

    if (!name || !calculator_type || !inputs) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await logToDatabase('info', 'POST /api/simulations', 'Attempting to save simulation', { userId, name, calculator_type });

    const { data, error } = await supabaseAdmin
      .from('saved_simulations')
      .insert([
        {
          user_id: userId,
          name,
          calculator_type,
          inputs,
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      await logToDatabase('error', 'POST /api/simulations', 'Supabase error saving simulation', { userId, name, calculator_type, error });
      throw error;
    }

    await logToDatabase('info', 'POST /api/simulations', 'Successfully saved simulation', { userId, name, calculator_type, data });
    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error('Error saving simulation:', error);
    await logToDatabase('error', 'POST /api/simulations', 'Exception saving simulation', { userId, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

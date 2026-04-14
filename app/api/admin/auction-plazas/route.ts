import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET all plazas
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: plazas, error } = await (supabaseAdmin
      .from('auction_plazas') as any)
      .select('*')
      .order('name');

    if (error) throw error;
    return NextResponse.json(plazas);
  } catch (error: any) {
    console.error('Error fetching plazas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create plaza
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { name, city, lat, lng } = data;

    const { data: newPlaza, error } = await (supabaseAdmin
      .from('auction_plazas') as any)
      .insert([{ name, city, lat, lng }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(newPlaza);
  } catch (error: any) {
    console.error('Error creating plaza:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET all auctions
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: auctions, error } = await (supabaseAdmin
      .from('auctions') as any)
      .select('*, plaza:auction_plazas(name)')
      .order('auction_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json(auctions);
  } catch (error: any) {
    console.error('Error fetching auctions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create auction
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { plaza_id, auction_date, commission, video_url } = data;

    const { data: newAuction, error } = await (supabaseAdmin
      .from('auctions') as any)
      .insert([{ plaza_id, auction_date, commission, video_url }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(newAuction);
  } catch (error: any) {
    console.error('Error creating auction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

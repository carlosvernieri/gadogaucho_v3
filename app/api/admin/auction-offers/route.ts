import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET offers (optionally filtered by auction_id)
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auctionId');

    let query = (supabaseAdmin.from('auction_offers') as any).select('*');
    if (auctionId) {
      query = query.eq('auction_id', auctionId);
    }
    
    const { data: offers, error } = await query.order('id');

    if (error) throw error;
    return NextResponse.json(offers);
  } catch (error: any) {
    console.error('Error fetching auction offers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create offer
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const {
      auction_id,
      category,
      breed,
      price_kg,
      avg_weight,
      batch_size,
      seller_name,
      seller_city,
      seller_lat,
      seller_lng
    } = data;

    const { data: newOffer, error } = await (supabaseAdmin
      .from('auction_offers') as any)
      .insert([{
        auction_id,
        category,
        breed,
        price_kg,
        avg_weight,
        batch_size,
        seller_name,
        seller_city,
        seller_lat,
        seller_lng
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(newOffer);
  } catch (error: any) {
    console.error('Error creating auction offer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

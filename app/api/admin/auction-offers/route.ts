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
    const includeAuction = searchParams.get('includeAuction');

    // Supabase has a default 1000-row limit per query.
    // We must paginate to fetch ALL offers when no specific auctionId filter is applied.
    let offers: any[] = [];

    if (auctionId) {
      // Single auction: unlikely to exceed 1000 offers
      const { data, error } = await (supabaseAdmin.from('auction_offers') as any)
        .select('*')
        .eq('auction_id', auctionId)
        .order('id');
      if (error) throw error;
      offers = data || [];
    } else {
      // Fetch ALL offers with pagination to avoid the 1000-row cap
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error } = await (supabaseAdmin.from('auction_offers') as any)
          .select('*')
          .order('id')
          .range(from, from + PAGE_SIZE - 1);
        
        if (error) throw error;
        
        if (page && page.length > 0) {
          offers = offers.concat(page);
          from += page.length;
          hasMore = page.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
    }

    if (includeAuction === 'true' || !auctionId) {
      // Fetch all auctions with plaza name for mapping
      const { data: auctionsData } = await (supabaseAdmin.from('auctions') as any)
        .select('*, plaza:auction_plazas(name)');
        
      if (auctionsData && auctionsData.length > 0) {
        const auctionMap = new Map<number, any>();
        auctionsData.forEach((a: any) => {
          const plazaObj = Array.isArray(a.plaza) ? a.plaza[0] : a.plaza;
          auctionMap.set(a.id, {
            id: a.id,
            auction_date: a.auction_date,
            plaza_id: a.plaza_id,
            commission: a.commission,
            plaza: { name: plazaObj?.name || '' }
          });
        });

        offers = offers.map((o: any) => ({
          ...o,
          auction: auctionMap.get(Number(o.auction_id)) || null
        }));
      }
    }

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
      price,
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
        price,
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

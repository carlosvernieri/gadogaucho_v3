import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { safeJsonStringify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get('seller');

    let query = (supabaseAdmin
      .from('listings') as any)
      .select('*, users(name, verified)');

    if (seller) {
      // If seller is passed as a name, we might need to filter by users.name
      // But usually it's better to filter by user_id if we have it.
      // For now, let's assume if seller is passed, it's a name filter on the joined table.
      query = query.eq('users.name', seller);
    }

    const { data: listings, error } = await query.order('id', { ascending: false });

    if (error) {
      // If the join fails, try a simple select
      const { data: fallbackListings, error: fallbackError } = await (supabaseAdmin
        .from('listings') as any)
        .select('*')
        .order('id', { ascending: false });
      
      if (fallbackError) {
        console.error('Supabase listings fetch failed completely:', fallbackError);
        return NextResponse.json([]);
      }
      
      const mappedListings = (fallbackListings || []).map((l: any) => ({
        ...l,
        sold: !!l.sold,
        verified: !!l.verified,
        verification_requested: !!l.verification_requested,
        priceKg: l.price_kg || l.priceKg,
        avgWeight: l.avg_weight || l.avgWeight,
        seller: 'Desconhecido',
        sellerVerified: false,
        sellerRating: 0,
      }));
      return NextResponse.json(mappedListings);
    }

    const mappedListings = listings.map((l: any) => ({
      ...l,
      sold: !!l.sold,
      verified: !!l.verified,
      verification_requested: !!l.verification_requested,
      priceKg: l.price_kg,
      avgWeight: l.avg_weight,
      seller: l.users?.name || 'Desconhecido',
      sellerVerified: !!l.users?.verified,
      sellerRating: 0,
    }));
    return NextResponse.json(mappedListings);
  } catch (error: any) {
    console.error('Error fetching listings:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to fetch listings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const data = await request.json();
    const { category, title, price, priceKg, avgWeight, quantity, location, lat, lng, image, description, images, videos } = data;
    const userId = data.userId || data.user_id;

    const { data: newListing, error } = await (supabaseAdmin
      .from('listings') as any)
      .insert([
        { 
          category, 
          title, 
          price, 
          price_kg: priceKg, 
          avg_weight: avgWeight, 
          quantity, 
          location, 
          lat, 
          lng, 
          user_id: userId || null,
          image, 
          description, 
          images: images || [], 
          videos: videos || [],
          verified: false,
          verification_requested: false
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase error creating listing:', safeJsonStringify(error, 2));
      throw error;
    }

    return NextResponse.json({
      ...newListing,
      priceKg: newListing.price_kg,
      avgWeight: newListing.avg_weight,
      verification_requested: newListing.verification_requested,
      userId: newListing.user_id
    });
  } catch (error: any) {
    console.error('Error creating listing:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to create listing' }, { status: 500 });
  }
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const { error } = await (supabaseAdmin
      .from('listings') as any)
      .delete()
      .neq('id', 0);

    if (error) {
      console.error('Supabase error deleting listings:', error);
      throw error;
    }

    return NextResponse.json({ message: 'All listings deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting listings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

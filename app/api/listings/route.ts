import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

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
      .select('*');

    if (seller) {
      query = query.eq('seller', seller);
    }

    const { data: listings, error } = await query.order('id', { ascending: false });

    if (error) throw error;

    const mappedListings = listings.map((l: any) => ({
      ...l,
      priceKg: l.price_kg,
      avgWeight: l.avg_weight,
      sellerRating: l.seller_rating,
    }));

    return NextResponse.json(mappedListings);
  } catch (error: any) {
    console.error('Supabase error fetching listings:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch listings', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const data = await request.json();
    const { category, title, price, priceKg, avgWeight, quantity, location, lat, lng, seller, image, description, images, videos } = data;

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
          seller, 
          image, 
          description, 
          images: images || [], 
          videos: videos || [] 
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...newListing,
      priceKg: newListing.price_kg,
      avgWeight: newListing.avg_weight,
      sellerRating: newListing.seller_rating,
    });
  } catch (error: any) {
    console.error('Supabase error creating listing:', error.message || error);
    return NextResponse.json({ error: 'Failed to create listing', details: error.message }, { status: 500 });
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
      .neq('id', 0); // Delete all

    if (error) throw error;

    return NextResponse.json({ message: 'All listings deleted successfully' });
  } catch (error: any) {
    console.error('Supabase error deleting listings:', error.message || error);
    return NextResponse.json({ error: 'Failed to delete listings', details: error.message }, { status: 500 });
  }
}

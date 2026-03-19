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

    const columns = 'id, category, title, price, price_kg, avg_weight, quantity, location, lat, lng, seller, seller_rating, verified, verification_requested, image, description, images, videos, created_at';
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
      sold: l.sold || false,
      priceKg: l.price_kg,
      avgWeight: l.avg_weight,
      sellerRating: l.seller_rating,
      verification_requested: l.verification_requested,
    }));

    return NextResponse.json(mappedListings);
  } catch (error: any) {
    console.error('Supabase error fetching listings:', JSON.stringify(error, null, 2));
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

    const columns = 'id, category, title, price, price_kg, avg_weight, quantity, location, lat, lng, seller, seller_rating, verified, verification_requested, image, description, images, videos, created_at';
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
          videos: videos || [],
          verified: false,
          verification_requested: false
        }
      ])
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...newListing,
      priceKg: newListing.price_kg,
      avgWeight: newListing.avg_weight,
      sellerRating: newListing.seller_rating,
      verification_requested: newListing.verification_requested,
    });
  } catch (error: any) {
    console.error('Supabase error creating listing:', JSON.stringify(error, null, 2));
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
    console.error('Supabase error deleting listings:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete listings', details: error.message }, { status: 500 });
  }
}

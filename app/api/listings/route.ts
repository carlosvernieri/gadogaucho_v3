import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get('seller');

    let query = (supabaseAdmin
      .from('listings') as any)
      .select('*, users(verified)');

    if (seller) {
      query = query.eq('seller', seller);
    }

    const { data: listings, error } = await query.order('id', { ascending: false });

    if (error) {
      console.error('Supabase error fetching listings:', JSON.stringify(error, null, 2));
      // Fallback to fetching without join if join fails (e.g. schema mismatch)
      const { data: fallbackListings, error: fallbackError } = await (supabaseAdmin
        .from('listings') as any)
        .select('*')
        .order('id', { ascending: false });
      
      if (fallbackError) {
        console.error('Supabase fallback error fetching listings:', JSON.stringify(fallbackError, null, 2));
        throw fallbackError;
      }
      
      const mappedListings = fallbackListings.map((l: any) => ({
        ...l,
        sold: !!l.sold,
        verified: !!l.verified,
        verification_requested: !!l.verification_requested,
        priceKg: l.price_kg,
        avgWeight: l.avg_weight,
        sellerVerified: false, // Fallback
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
      sellerVerified: !!l.users?.verified,
    }));
    return NextResponse.json(mappedListings);
  } catch (error: any) {
    console.error('Error fetching listings:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to fetch listings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { category, title, price, priceKg, avgWeight, quantity, location, lat, lng, seller, userId, image, description, images, videos } = data;

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
      console.error('Supabase error creating listing:', JSON.stringify(error, null, 2));
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

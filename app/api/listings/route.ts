import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { safeJsonStringify, parseJsonField } from '@/lib/utils';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get('seller');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const verified = searchParams.get('verified') === 'true';
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius');

    const offset = (page - 1) * limit;

    let listings = [];
    let error = null;

    if (latStr && lngStr && radiusStr) {
      // Use RPC for geographic filtering
      const { data, error: rpcError } = await (supabaseAdmin.rpc as any)('get_listings_within_radius', {
        target_lat: parseFloat(latStr),
        target_lng: parseFloat(lngStr),
        max_distance_km: parseFloat(radiusStr),
        category_filter: category || null,
        search_filter: search || null,
        offset_val: offset,
        limit_val: limit
      });
      listings = data || [];
      error = rpcError;
    } else {
      // Standard query
      let query = (supabaseAdmin
        .from('listings') as any)
        .select('*, users(name, verified)');

      if (seller) {
        query = query.eq('users.name', seller);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        // If not looking for a specific user's listings, only show available (not sold)
        query = query.or('sold.eq.false,sold.is.null');
      }

      if (category) {
        query = query.ilike('category', category);
      }
      if (search) {
        if (!isNaN(Number(search))) {
           query = query.or(`title.ilike.%${search}%,id.eq.${search}`);
        } else {
           query = query.ilike('title', `%${search}%`);
        }
      }
      
      if (verified) {
        query = query.eq('verified', true);
      }

      query = query.order('id', { ascending: false }).range(offset, offset + limit - 1);

      const { data, error: qError } = await query;
      listings = data || [];
      error = qError;
    }

    if (error) {
      console.error('Supabase listings fetch error:', error);
      // Fallback
      return NextResponse.json([]);
    }

    const mappedListings = listings.map((l: any) => ({
      ...l,
      sold: !!l.sold,
      verified: !!l.verified,
      verification_requested: !!l.verification_requested,
      priceKg: l.price_kg || l.priceKg, // fallback to camelCase if coming from RPC
      avgWeight: l.avg_weight || l.avgWeight,
      images: parseJsonField(l.images),
      videos: parseJsonField(l.videos),
      seller: l.seller_name || l.users?.name || 'Desconhecido',
      sellerVerified: !!l.seller_verified || !!l.users?.verified,
      sellerRating: 0,
      distanceKm: l.distance_km || null // From RPC
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
    const { category, breed, title, price, priceKg, avgWeight, quantity, location, lat, lng, image, description, images, videos } = data;
    
    const session = await getSession();
    if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.id;

    const { data: newListing, error } = await (supabaseAdmin
      .from('listings') as any)
      .insert([
        { 
          category, 
          breed: breed || null,
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
      images: parseJsonField(newListing.images),
      videos: parseJsonField(newListing.videos),
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
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
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

import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { createClientServer } from '@/lib/supabase-server';
import { safeJsonStringify, parseJsonField } from '@/lib/utils';
import { getSession } from '@/lib/auth';
import { triggerOpportunityAlerts } from '@/lib/alerts-dispatcher';
import { sendNewListingAdminNotification } from '@/lib/email';

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
    const featured = searchParams.get('featured') === 'true';
    const verified = searchParams.get('verified') === 'true';
    const showAll = searchParams.get('showAll') === 'true';
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius');

    const offset = (page - 1) * limit;

    let listings = [];
    let error = null;

    // Fetch matching user IDs if search term exists and is not numeric (for seller name search)
    let matchingUserIds: string[] = [];
    if (search && isNaN(Number(search))) {
      try {
        const { data: usersData } = await supabaseAdmin
          .from('users')
          .select('id')
          .ilike('name', `%${search}%`);
        if (usersData) {
          matchingUserIds = usersData.map((u: any) => u.id);
        }
      } catch (err) {
        console.error('Error matching users by name:', err);
      }
    }

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
      
      if (rpcError) {
        console.error('RPC fallback required: ', rpcError);
        // Fallback to JS filtering if RPC fails or doesn't exist
        error = null;
        const selectStr = verified ? '*, users!inner(name, verified)' : '*, users(name, verified)';
        let query = (supabaseAdmin.from('listings') as any).select(selectStr);
        if (!showAll) {
          query = query.or('sold.eq.false,sold.is.null'); // only active ads
        }
        if (verified) {
          query = query.eq('users.verified', true);
        }
        if (category) query = query.ilike('category', category);
        if (search) {
          let orConditions = [`title.ilike.%${search}%`];
          if (!isNaN(Number(search))) {
            orConditions.push(`id.eq.${search}`);
          }
          if (matchingUserIds.length > 0) {
            orConditions.push(`user_id.in.(${matchingUserIds.join(',')})`);
          }
          query = query.or(orConditions.join(','));
        }
        if (featured) query = query.eq('featured', true);
        query = query.order('featured', { ascending: false }).order('id', { ascending: false });

        const { data: allData, error: qError } = await query;
        if (qError) {
            error = qError;
        } else if (allData) {
            const R = 6371; // km
            const targetLat = parseFloat(latStr);
            const targetLng = parseFloat(lngStr);
            const radius = parseFloat(radiusStr);
            
            listings = allData.filter((item: any) => {
                if (!item.lat || !item.lng) return false;
                const dLat = (item.lat - targetLat) * Math.PI / 180;
                const dLng = (item.lng - targetLng) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(targetLat * Math.PI / 180) * Math.cos(item.lat * Math.PI / 180) * 
                          Math.sin(dLng/2) * Math.sin(dLng/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                item.distance_km = R * c;
                return item.distance_km <= radius;
            });
            // Manual pagination for fallback
            listings = listings.slice(offset, offset + limit);
        }
      }
    } else {
      // Standard query
      const selectStr = verified ? '*, users!inner(name, verified)' : '*, users(name, verified)';
      let query = (supabaseAdmin
        .from('listings') as any)
        .select(selectStr);

      if (verified) {
        query = query.eq('users.verified', true);
      }

      if (seller) {
        query = query.eq('users.name', seller);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (!showAll) {
        // If not looking for a specific user's listings, only show available (not sold)
        query = query.or('sold.eq.false,sold.is.null');
      }

      if (category) {
        query = query.ilike('category', category);
      }
      if (search) {
        let orConditions = [`title.ilike.%${search}%`];
        if (!isNaN(Number(search))) {
          orConditions.push(`id.eq.${search}`);
        }
        if (matchingUserIds.length > 0) {
          orConditions.push(`user_id.in.(${matchingUserIds.join(',')})`);
        }
        query = query.or(orConditions.join(','));
      }
      
      if (featured) {
        query = query.eq('featured', true);
      }

      query = query.order('featured', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit - 1);

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
      featured: !!l.featured,
      feature_requested: !!l.feature_requested,
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

    const supabase = await createClientServer();
    const { data: newListing, error } = await supabase
      .from('listings')
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
          featured: false,
          feature_requested: false
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase error creating listing:', safeJsonStringify(error, 2));
      throw error;
    }

    // Disparar alertas de oportunidades em segundo plano
    triggerOpportunityAlerts(newListing).catch((err) => {
      console.error('[POST Listing] Falha ao disparar alertas de oportunidades:', err);
    });

    // Enviar notificação de novo anúncio por e-mail para o administrador
    sendNewListingAdminNotification(newListing).catch((err) => {
      console.error('[POST Listing] Falha ao enviar notificação para o admin:', err);
    });

    return NextResponse.json({
      ...newListing,
      priceKg: newListing.price_kg,
      avgWeight: newListing.avg_weight,
      feature_requested: newListing.feature_requested,
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

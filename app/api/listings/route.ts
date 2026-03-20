import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get('seller');

    if (isSupabaseConfigured()) {
      let query = (supabaseAdmin
        .from('listings') as any)
        .select('*');

      if (seller) {
        query = query.eq('seller', seller);
      }

      const { data: listings, error } = await query.order('id', { ascending: false });

      if (!error) {
        const mappedListings = listings.map((l: any) => ({
          ...l,
          sold: l.sold || false,
          priceKg: l.price_kg,
          avgWeight: l.avg_weight,
          sellerRating: l.seller_rating,
          verification_requested: l.verification_requested,
        }));
        return NextResponse.json(mappedListings);
      }
      console.error('Supabase error fetching listings:', error);
    }

    // SQLite fallback
    let listings;
    if (seller) {
      listings = db.prepare('SELECT * FROM listings WHERE seller = ? ORDER BY id DESC').all(seller);
    } else {
      listings = db.prepare('SELECT * FROM listings ORDER BY id DESC').all();
    }

    const mappedListings = listings.map((l: any) => ({
      ...l,
      sold: !!l.sold,
      verified: !!l.verified,
      verification_requested: !!l.verification_requested,
      images: JSON.parse(l.images || '[]'),
      videos: JSON.parse(l.videos || '[]'),
    }));

    return NextResponse.json(mappedListings);
  } catch (error: any) {
    console.error('Error fetching listings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { category, title, price, priceKg, avgWeight, quantity, location, lat, lng, seller, image, description, images, videos } = data;

    if (isSupabaseConfigured()) {
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

      if (!error) {
        return NextResponse.json({
          ...newListing,
          priceKg: newListing.price_kg,
          avgWeight: newListing.avg_weight,
          sellerRating: newListing.seller_rating,
          verification_requested: newListing.verification_requested,
        });
      }
      console.error('Supabase error creating listing:', error);
    }

    // SQLite fallback
    const result = db.prepare(`
      INSERT INTO listings (category, title, price, priceKg, avgWeight, quantity, location, lat, lng, seller, image, description, images, videos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      category, title, price, priceKg, avgWeight, quantity, location, lat, lng, seller, image, description, 
      JSON.stringify(images || []), JSON.stringify(videos || [])
    );

    const newListing = db.prepare('SELECT * FROM listings WHERE id = ?').get(result.lastInsertRowid) as any;
    return NextResponse.json({
      ...newListing,
      sold: !!newListing.sold,
      verified: !!newListing.verified,
      verification_requested: !!newListing.verification_requested,
      images: JSON.parse(newListing.images || '[]'),
      videos: JSON.parse(newListing.videos || '[]'),
    });
  } catch (error: any) {
    console.error('Error creating listing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (isSupabaseConfigured()) {
      const { error } = await (supabaseAdmin
        .from('listings') as any)
        .delete()
        .neq('id', 0);

      if (!error) return NextResponse.json({ message: 'All listings deleted successfully' });
      console.error('Supabase error deleting listings:', error);
    }

    db.prepare('DELETE FROM listings').run();
    return NextResponse.json({ message: 'All listings deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting listings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

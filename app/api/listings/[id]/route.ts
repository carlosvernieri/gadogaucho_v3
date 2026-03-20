import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured()) {
      const { data: listing, error } = await (supabaseAdmin
        .from('listings') as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!error && listing) {
        const l = listing as any;
        return NextResponse.json({
          ...l,
          sold: l.sold || false,
          priceKg: l.price_kg,
          avgWeight: l.avg_weight,
          sellerRating: l.seller_rating,
        });
      }
      console.error('Supabase error fetching listing:', error);
    }

    // SQLite fallback
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as any;
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...listing,
      sold: !!listing.sold,
      verified: !!listing.verified,
      verification_requested: !!listing.verification_requested,
      images: JSON.parse(listing.images || '[]'),
      videos: JSON.parse(listing.videos || '[]'),
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (isSupabaseConfigured()) {
      const { error } = await (supabaseAdmin
        .from('listings') as any)
        .delete()
        .eq('id', id);

      if (!error) return NextResponse.json({ success: true });
      console.error('Supabase error deleting listing:', error);
    }

    db.prepare('DELETE FROM listings WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    if (isSupabaseConfigured()) {
      // Map camelCase to snake_case for Supabase
      const updateData: any = {};
      if (data.category !== undefined) updateData.category = data.category;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.priceKg !== undefined) updateData.price_kg = data.priceKg;
      if (data.avgWeight !== undefined) updateData.avg_weight = data.avgWeight;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.lat !== undefined) updateData.lat = data.lat;
      if (data.lng !== undefined) updateData.lng = data.lng;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.images !== undefined) updateData.images = data.images;
      if (data.videos !== undefined) updateData.videos = data.videos;
      if (data.verified !== undefined) updateData.verified = data.verified;
      if (data.verification_requested !== undefined) updateData.verification_requested = data.verification_requested;
      if (data.sold !== undefined) updateData.sold = data.sold;

      const { data: updatedListing, error } = await (supabaseAdmin
        .from('listings') as any)
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (!error) {
        return NextResponse.json({
          ...updatedListing,
          priceKg: updatedListing.price_kg,
          avgWeight: updatedListing.avg_weight,
          sellerRating: updatedListing.seller_rating,
          verification_requested: updatedListing.verification_requested,
        });
      }
      console.error('Supabase error updating listing:', error);
    }

    // SQLite fallback
    const fields = [];
    const values = [];
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
    if (data.priceKg !== undefined) { fields.push('priceKg = ?'); values.push(data.priceKg); }
    if (data.avgWeight !== undefined) { fields.push('avgWeight = ?'); values.push(data.avgWeight); }
    if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity); }
    if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }
    if (data.lat !== undefined) { fields.push('lat = ?'); values.push(data.lat); }
    if (data.lng !== undefined) { fields.push('lng = ?'); values.push(data.lng); }
    if (data.image !== undefined) { fields.push('image = ?'); values.push(data.image); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.images !== undefined) { fields.push('images = ?'); values.push(JSON.stringify(data.images)); }
    if (data.videos !== undefined) { fields.push('videos = ?'); values.push(JSON.stringify(data.videos)); }
    if (data.verified !== undefined) { fields.push('verified = ?'); values.push(data.verified ? 1 : 0); }
    if (data.verification_requested !== undefined) { fields.push('verification_requested = ?'); values.push(data.verification_requested ? 1 : 0); }
    if (data.sold !== undefined) { fields.push('sold = ?'); values.push(data.sold ? 1 : 0); }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE listings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    const updatedListing = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as any;
    return NextResponse.json({
      ...updatedListing,
      sold: !!updatedListing.sold,
      verified: !!updatedListing.verified,
      verification_requested: !!updatedListing.verification_requested,
      images: JSON.parse(updatedListing.images || '[]'),
      videos: JSON.parse(updatedListing.videos || '[]'),
    });
  } catch (error: any) {
    console.error('Error updating listing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

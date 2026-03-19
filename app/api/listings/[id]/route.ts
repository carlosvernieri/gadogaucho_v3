import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const columns = 'id, category, title, price, price_kg, avg_weight, quantity, location, lat, lng, seller, seller_rating, verified, image, description, images, videos, created_at';
    const { data: listing, error } = await (supabaseAdmin
      .from('listings') as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const l = listing as any;

    return NextResponse.json({
      ...l,
      sold: l.sold || false,
      priceKg: l.price_kg,
      avgWeight: l.avg_weight,
      sellerRating: l.seller_rating,
    });
  } catch (error) {
    console.error('Supabase error fetching listing:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await (supabaseAdmin
      .from('listings') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supabase error deleting listing:', JSON.stringify(error, null, 2));
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

    if (error) throw error;

    return NextResponse.json({
      ...updatedListing,
      priceKg: updatedListing.price_kg,
      avgWeight: updatedListing.avg_weight,
      sellerRating: updatedListing.seller_rating,
      verification_requested: updatedListing.verification_requested,
    });
  } catch (error: any) {
    console.error('Supabase error updating listing:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: 'Failed to update listing', 
      details: error.message || error,
      code: error.code
    }, { status: 500 });
  }
}

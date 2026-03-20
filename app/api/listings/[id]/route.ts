import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: listing, error } = await (supabaseAdmin
      .from('listings') as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('Supabase error fetching listing:', error);
      throw error;
    }

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const l = listing as any;
    return NextResponse.json({
      ...l,
      sold: !!l.sold,
      verified: !!l.verified,
      verification_requested: !!l.verification_requested,
      priceKg: l.price_kg,
      avgWeight: l.avg_weight,
      sellerRating: l.seller_rating,
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
    const { error } = await (supabaseAdmin
      .from('listings') as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting listing:', error);
      throw error;
    }

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
    if (data.userId !== undefined) updateData.user_id = data.userId;
    if (data.verified !== undefined) updateData.verified = data.verified;
    if (data.verification_requested !== undefined) updateData.verification_requested = data.verification_requested;
    if (data.sold !== undefined) updateData.sold = data.sold;

    const { data: updatedListing, error } = await (supabaseAdmin
      .from('listings') as any)
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase error updating listing:', error);
      throw error;
    }

    return NextResponse.json({
      ...updatedListing,
      priceKg: updatedListing.price_kg,
      avgWeight: updatedListing.avg_weight,
      sellerRating: updatedListing.seller_rating,
      verification_requested: updatedListing.verification_requested,
    });
  } catch (error: any) {
    console.error('Error updating listing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

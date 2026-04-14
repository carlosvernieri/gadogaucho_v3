import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT update offer
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    const data = await request.json();
    const {
      auction_id,
      category,
      breed,
      price_kg,
      avg_weight,
      batch_size,
      seller_name,
      seller_city,
      seller_lat,
      seller_lng
    } = data;

    const { data: updatedOffer, error } = await (supabaseAdmin
      .from('auction_offers') as any)
      .update({
        auction_id,
        category,
        breed,
        price_kg,
        avg_weight,
        batch_size,
        seller_name,
        seller_city,
        seller_lat,
        seller_lng
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updatedOffer);
  } catch (error: any) {
    console.error('Error updating auction offer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE offer
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    const { error } = await (supabaseAdmin
      .from('auction_offers') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting auction offer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

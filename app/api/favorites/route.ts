import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  try {
    const { data: favorites, error } = await (supabaseAdmin
      .from('favorites') as any)
      .select('listing_id')
      .eq('user_email', email);

    if (error) throw error;

    return NextResponse.json((favorites || []).map((f: any) => f.listing_id));
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, listingId } = body;

    const { error } = await (supabaseAdmin
      .from('favorites') as any)
      .upsert({ user_email: email, listing_id: listingId }, { onConflict: 'user_email,listing_id' });

    if (error) throw error;

    return NextResponse.json({ message: 'Favorite added' });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { email, listingId } = body;

    const { error } = await (supabaseAdmin
      .from('favorites') as any)
      .delete()
      .eq('user_email', email)
      .eq('listing_id', listingId);

    if (error) throw error;

    return NextResponse.json({ message: 'Favorite removed' });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}

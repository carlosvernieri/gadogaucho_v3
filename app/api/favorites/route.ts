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

    if (error) {
      console.error('Supabase error fetching favorites:', error);
      throw error;
    }

    return NextResponse.json(favorites.map((f: any) => f.listing_id));
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, listingId } = body;

    const { error } = await (supabaseAdmin
      .from('favorites') as any)
      .upsert({ user_email: email, listing_id: listingId }, { onConflict: 'user_email,listing_id' });

    if (error) {
      console.error('Supabase error adding favorite:', error);
      throw error;
    }

    return NextResponse.json({ message: 'Favorite added' });
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    if (error) {
      console.error('Supabase error removing favorite:', error);
      throw error;
    }

    return NextResponse.json({ message: 'Favorite removed' });
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

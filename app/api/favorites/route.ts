import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.id;

  try {
    const { data: favorites, error } = await (supabaseAdmin
      .from('favorites') as any)
      .select('listing_id')
      .eq('user_id', userId);

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
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.id;

    const body = await request.json();
    const { listingId } = body;

    const { error } = await (supabaseAdmin
      .from('favorites') as any)
      .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' });

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
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.id;

    const body = await request.json();
    const { listingId } = body;

    const { error } = await (supabaseAdmin
      .from('favorites') as any)
      .delete()
      .eq('user_id', userId)
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


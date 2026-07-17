import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { logToDatabase } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    await logToDatabase('error', 'GET /api/favorites', 'Supabase is not configured');
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  const session = await getSession();
  if (!session || !session.id) {
    await logToDatabase('warn', 'GET /api/favorites', 'Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.id;

  try {
    const { data: favorites, error } = await (supabaseAdmin
      .from('favorites') as any)
      .select('listing_id')
      .eq('user_id', userId);

    if (error) {
      await logToDatabase('error', 'GET /api/favorites', 'Supabase error fetching favorites', { userId, error });
      throw error;
    }

    await logToDatabase('info', 'GET /api/favorites', `Successfully fetched ${favorites?.length || 0} favorites for user`, { userId, count: favorites?.length || 0 });
    return NextResponse.json(favorites.map((f: any) => f.listing_id));
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    await logToDatabase('error', 'GET /api/favorites', 'Exception fetching favorites', { userId, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    await logToDatabase('error', 'POST /api/favorites', 'Supabase is not configured');
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  let userId: string | null = null;
  try {
    const session = await getSession();
    if (!session || !session.id) {
      await logToDatabase('warn', 'POST /api/favorites', 'Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = session.id;

    const body = await request.json();
    const { listingId } = body;

    await logToDatabase('info', 'POST /api/favorites', 'Attempting to add favorite', { userId, listingId });

    const { data, error } = await (supabaseAdmin
      .from('favorites') as any)
      .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' })
      .select();

    if (error) {
      await logToDatabase('error', 'POST /api/favorites', 'Supabase error adding favorite', { userId, listingId, error });
      throw error;
    }

    await logToDatabase('info', 'POST /api/favorites', 'Successfully added favorite', { userId, listingId, data });
    return NextResponse.json({ message: 'Favorite added' });
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    await logToDatabase('error', 'POST /api/favorites', 'Exception adding favorite', { userId, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    await logToDatabase('error', 'DELETE /api/favorites', 'Supabase is not configured');
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  let userId: string | null = null;
  try {
    const session = await getSession();
    if (!session || !session.id) {
      await logToDatabase('warn', 'DELETE /api/favorites', 'Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = session.id;

    const body = await request.json();
    const { listingId } = body;

    await logToDatabase('info', 'DELETE /api/favorites', 'Attempting to remove favorite', { userId, listingId });

    const { data, error } = await (supabaseAdmin
      .from('favorites') as any)
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .select();

    if (error) {
      await logToDatabase('error', 'DELETE /api/favorites', 'Supabase error removing favorite', { userId, listingId, error });
      throw error;
    }

    await logToDatabase('info', 'DELETE /api/favorites', 'Successfully removed favorite', { userId, listingId, data });
    return NextResponse.json({ message: 'Favorite removed' });
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    await logToDatabase('error', 'DELETE /api/favorites', 'Exception removing favorite', { userId, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



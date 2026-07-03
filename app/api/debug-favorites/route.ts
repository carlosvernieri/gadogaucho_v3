import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: favorites, error: favError } = await supabaseAdmin
      .from('favorites')
      .select('*')
      .limit(100);

    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .limit(10);

    return NextResponse.json({
      success: true,
      favorites: favorites || [],
      favoritesError: favError,
      users: users || [],
      usersError: userError
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    });
  }
}

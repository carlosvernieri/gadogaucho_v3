import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const { data: user, error } = await (supabaseAdmin
      .from('users') as any)
      .select('id, name, email, phone, city, is_admin, verified')
      .eq('id', session.id)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

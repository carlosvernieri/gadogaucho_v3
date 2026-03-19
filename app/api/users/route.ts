import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const { data: users, error } = await (supabaseAdmin
      .from('users') as any)
      .select('id, name, email, phone, city, is_admin');

    if (error) throw error;

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Supabase error fetching users:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch users', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const data = await request.json();
    const { name, email, phone, city, password, is_admin } = data;

    const { data: newUser, error } = await (supabaseAdmin
      .from('users') as any)
      .insert([
        { name, email, phone, city, password, is_admin: !!is_admin }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error('Supabase error creating user:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create user', details: error.message }, { status: 500 });
  }
}

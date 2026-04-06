import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const { data: users, error } = await (supabaseAdmin
      .from('users') as any)
      .select('id, name, email, phone, city, is_admin, verified');

    if (error) {
      // If the full select fails, try a simple select
      const { data: fallbackUsers, error: fallbackError } = await (supabaseAdmin
        .from('users') as any)
        .select('*');
      
      if (fallbackError) {
        console.error('Supabase users fetch failed completely:', fallbackError);
        return NextResponse.json([]);
      }
      
      const mappedUsers = (fallbackUsers || []).map((u: any) => ({
        ...u,
        verified: u.verified ?? false,
        rating: 0
      }));
      return NextResponse.json(mappedUsers);
    }

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const data = await request.json();
    const { name, email, phone, city, password, is_admin } = data;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await (supabaseAdmin
      .from('users') as any)
      .insert([
        { name, email, phone, city, password: hashedPassword, is_admin: !!is_admin }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating user:', error);
      throw error;
    }

    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

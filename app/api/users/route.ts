import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: users, error } = await (supabaseAdmin
      .from('users') as any)
      .select('id, name, email, phone, city, is_admin');

    if (error) {
      console.error('Supabase error fetching users:', error);
      throw error;
    }

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

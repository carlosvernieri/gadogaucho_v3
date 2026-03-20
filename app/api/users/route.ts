import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data: users, error } = await (supabaseAdmin
        .from('users') as any)
        .select('id, name, email, phone, city, is_admin');

      if (!error) return NextResponse.json(users);
      console.error('Supabase error fetching users:', error);
    }

    const users = db.prepare('SELECT id, name, email, phone, city, is_admin FROM users').all();
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

    if (isSupabaseConfigured()) {
      const { data: newUser, error } = await (supabaseAdmin
        .from('users') as any)
        .insert([
          { name, email, phone, city, password, is_admin: !!is_admin }
        ])
        .select()
        .single();

      if (!error) return NextResponse.json(newUser);
      console.error('Supabase error creating user:', error);
    }

    const result = db.prepare(`
      INSERT INTO users (name, email, phone, city, password, is_admin)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email, phone, city, password, is_admin ? 1 : 0);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

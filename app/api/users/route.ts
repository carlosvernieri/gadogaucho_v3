import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const offset = (page - 1) * limit;

    let query = (supabaseAdmin
      .from('users') as any)
      .select('id, name, email, phone, city, is_admin, verified, verification_status, verification_document_url, verification_selfie_url, verification_rejected_reason');

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('verification_status', status);
    }

    query = query.order('id', { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, error } = await query;

    if (error) {
      console.error('Supabase users fetch failed:', error);
      return NextResponse.json([]);
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
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { name, email, phone, city, password } = data;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await (supabaseAdmin
      .from('users') as any)
      .insert([
        { name, email, phone, city, password: hashedPassword }
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

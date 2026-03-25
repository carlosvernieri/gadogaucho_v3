import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isValidPhone } from '@/lib/utils';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const { name, email, password, city, phone } = body;

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: 'Telefone inválido. Use o formato (xx) xxxx xxxxx' }, { status: 400 });
    }

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const isAdmin = email === 'admin@admin.com';

    const { data: newUser, error } = await (supabaseAdmin
      .from('users') as any)
      .insert([
        { name, email, password, city, phone, is_admin: isAdmin }
      ])
      .select()
      .single();

    if (error) throw error;

    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      ...userWithoutPassword,
      is_admin: !!userWithoutPassword.is_admin
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}

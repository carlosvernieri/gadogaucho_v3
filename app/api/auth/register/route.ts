import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const { name, email, password, city, phone } = body;

    const rawPhone = phone ? phone.replace(/\D/g, '') : '';
    if (rawPhone.length !== 11) {
      return NextResponse.json({ error: 'Telefone inválido. Utilize o formato (xx) xxxx xxxxx' }, { status: 400 });
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await (supabaseAdmin
      .from('users') as any)
      .insert([
        { name, email, password: hashedPassword, city, phone }
      ])
      .select()
      .single();

    if (error) throw error;

    const { password: _, ...userWithoutPassword } = newUser;
    
    const finalUser = {
      ...userWithoutPassword,
      is_admin: !!userWithoutPassword.is_admin
    };

    const token = await signToken({ id: finalUser.id, email: finalUser.email, is_admin: finalUser.is_admin });
    await setSessionCookie(token);

    return NextResponse.json(finalUser);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}

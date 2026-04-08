import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userData = user as any;

    let isPasswordValid = false;
    if (userData.password && userData.password.startsWith('$2')) {
      isPasswordValid = await bcrypt.compare(password, userData.password);
    } else {
      isPasswordValid = userData.password === password;
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = userData;
    const finalUser = {
      ...userWithoutPassword,
      is_admin: !!userWithoutPassword.is_admin
    };

    const token = await signToken({ id: finalUser.id, email: finalUser.email, is_admin: finalUser.is_admin });
    await setSessionCookie(token);

    return NextResponse.json(finalUser);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

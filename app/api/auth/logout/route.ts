import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClientServer } from '@/lib/supabase-server';

export async function POST() {
  const supabase = await createClientServer();
  await supabase.auth.signOut();

  const response = NextResponse.json({ success: true });

  // Limpar os cookies do Supabase Auth na resposta
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}

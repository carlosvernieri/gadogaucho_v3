import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = isSupabaseConfigured();
  
  if (!configured) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Supabase environment variables are missing.',
      config: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }, { status: 503 });
  }

  try {
    // Attempt a simple query to check connection
    const { data, error } = await supabaseAdmin.from('listings').select('id').limit(1);

    if (error) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Connected to Supabase but failed to query table.',
        details: error.message,
        code: error.code,
        full_error: error
      }, { status: 500 });
    }

    return NextResponse.json({ 
      status: 'success', 
      message: 'Successfully connected to Supabase!',
      data_found: data ? data.length > 0 : false
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'An unexpected error occurred while connecting to Supabase.',
      details: error.message,
      full_error: error
    }, { status: 500 });
  }
}

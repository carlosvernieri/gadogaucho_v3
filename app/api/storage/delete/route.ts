import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    const pathsToRemove = urls
      .filter((url: string) => url && url.includes('supabase.co') && url.includes('gado_gaucho_media/'))
      .map((url: string) => url.split('gado_gaucho_media/')[1])
      .filter(Boolean);

    if (pathsToRemove.length === 0) {
      return NextResponse.json({ success: true, removed: 0 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from('gado_gaucho_media')
      .remove(pathsToRemove);

    if (error) {
      console.error('Storage delete error:', error);
      return NextResponse.json({ error: 'Failed to delete media from storage', details: error.message }, { status: 500 });
    }

    console.log(`Successfully deleted ${pathsToRemove.length} files from storage:`, pathsToRemove);
    return NextResponse.json({ success: true, removed: pathsToRemove.length, data });
  } catch (error: any) {
    console.error('Error in storage delete API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

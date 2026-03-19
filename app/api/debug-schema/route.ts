import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    // Try to check all tables
    const tables = ['listings', 'users', 'favorites'];
    const results: any = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await (supabaseAdmin.from(table) as any).select('*').limit(1);
        if (error) {
          results[table] = { error: error.message, code: error.code };
        } else {
          const firstRow = data[0] || {};
          results[table] = { 
            columns: Object.keys(firstRow),
            rowCount: data.length,
            sample: firstRow
          };
        }
      } catch (e: any) {
        results[table] = { error: e.message };
      }
    }
    
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

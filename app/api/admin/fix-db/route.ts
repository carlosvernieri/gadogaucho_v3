import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const missingColumns = [];
    
    // Check verification_requested
    const { error: err1 } = await (supabaseAdmin
      .from('listings') as any)
      .select('verification_requested')
      .limit(1);
    if (err1) missingColumns.push('verification_requested');

    // Check sold
    const { error: err2 } = await (supabaseAdmin
      .from('listings') as any)
      .select('sold')
      .limit(1);
    if (err2) missingColumns.push('sold');

    if (missingColumns.length > 0) {
      const sql = missingColumns.map(col => `ALTER TABLE listings ADD COLUMN IF NOT EXISTS ${col} BOOLEAN DEFAULT FALSE;`).join('\n');
      return NextResponse.json({ 
        error: `Colunas ausentes: ${missingColumns.join(', ')}`,
        details: 'Algumas colunas necessárias não foram encontradas na tabela "listings".',
        sql: sql
      }, { status: 500 });
    }

    return NextResponse.json({ message: 'Todas as colunas necessárias existem no banco de dados.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to check database', details: error.message }, { status: 500 });
  }
}

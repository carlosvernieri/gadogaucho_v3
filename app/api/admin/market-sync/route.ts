import { NextResponse } from 'next/server';
import { scrapeCepea, scrapeScot, fetchB3Futures, saveMarketData, getMarketData } from '@/lib/market-scraper';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // 1. Authorization check (simplified, should use session in real app)
    // For now, we trust the admin caller from the protected page
    
    console.log('Starting market data synchronization...');
    
    // 2. Fetch all data in parallel
    const [cepea, scot, b3] = await Promise.all([
      scrapeCepea(),
      scrapeScot(),
      fetchB3Futures()
    ]);

    const syncResults = {
      cepea: cepea || { error: 'Failed' },
      scot: scot || { error: 'Failed' },
      b3: b3 || { error: 'Failed' },
      timestamp: new Date().toISOString()
    };

    // 3. Save to Local JSON
    await saveMarketData(syncResults);

    // 4. (Opcional) O backup em Banco de Dados foi removido por falta de tabela admin_settings

    return NextResponse.json({ 
      success: true, 
      message: 'Indicadores sincronizados com sucesso!',
      data: syncResults
    });

  } catch (error: any) {
    console.error('Market sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET to just check the current status
export async function GET() {
  try {
     const data = await getMarketData();
     return NextResponse.json(data);
  } catch (e) {
     return NextResponse.json({ error: 'No data found' });
  }
}

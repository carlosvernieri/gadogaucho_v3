import { NextResponse } from 'next/server';
import { scrapeCepea, scrapeScot, fetchB3Futures, saveMarketData, getMarketData, getPromptSettings } from '@/lib/market-scraper';
import { supabaseAdmin } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    console.log('Starting market data synchronization and AI summary generation...');
    
    // 1. Fetch all scraped data in parallel
    const [cepea, scot, b3] = await Promise.all([
      scrapeCepea(),
      scrapeScot(),
      fetchB3Futures()
    ]);

    // 2. Fetch database market averages
    const categories = ['Vaca', 'Novilha', 'Boi Gordo', 'Terneiro', 'Terneira'];
    let dbStats: any = null;
    try {
      const { data, error } = await supabaseAdmin.rpc('get_market_averages');
      if (!error) {
        dbStats = data;
      } else {
        console.error('RPC Error (get_market_averages):', error);
      }
    } catch (err) {
      console.error('RPC Exception:', err);
    }

    const categoryStats = categories.map(cat => {
      const statsForCat = dbStats?.[cat] || { auctionAvg: 0, prevAuctionAvg: 0, platformAvg: 0 };
      const auctionAvg = typeof statsForCat.auctionAvg === 'number' ? statsForCat.auctionAvg : parseFloat(statsForCat.auctionAvg || 0);
      const prevAuctionAvg = typeof statsForCat.prevAuctionAvg === 'number' ? statsForCat.prevAuctionAvg : parseFloat(statsForCat.prevAuctionAvg || 0);
      const platformAvg = typeof statsForCat.platformAvg === 'number' ? statsForCat.platformAvg : parseFloat(statsForCat.platformAvg || 0);
      const delta = prevAuctionAvg > 0 ? ((auctionAvg - prevAuctionAvg) / prevAuctionAvg) * 100 : 0;
      return {
        category: cat,
        auctionAvg: parseFloat(auctionAvg.toFixed(2)),
        prevAuctionAvg: parseFloat(prevAuctionAvg.toFixed(2)),
        platformAvg: parseFloat(platformAvg.toFixed(2)),
        delta: parseFloat(delta.toFixed(1)),
        trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable'
      };
    });

    // 3. Generate AI summary using Gemini 3.5 Flash
    let aiSummary: string | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('Generating AI summary with Gemini 3.5 Flash...');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const promptSettings = await getPromptSettings();
        const systemInstruction = promptSettings.prompt;
        
        const dataPrompt = `${systemInstruction}

DADOS DE MERCADO:
1. Médias de Categorias no Rio Grande do Sul (Leilões vs Venda Direta na Plataforma):
${categoryStats.map(s => `- ${s.category}: Média Leilões (Atacado) = R$ ${s.auctionAvg}/kg, Média Gado Gaúcho = R$ ${s.platformAvg}/kg, Variação Semanal = ${s.delta}% (${s.trend === 'up' ? 'Alta' : s.trend === 'down' ? 'Baixa' : 'Estável'})`).join('\n')}

2. Referência Scot Consultoria (RS):
- Pelotas: ${JSON.stringify(scot?.pelotas || [])}
- Oeste: ${JSON.stringify(scot?.oeste || [])}

3. Indicador CEPEA (SP/B3):
- Valor: R$ ${((cepea?.price || 0) / 30).toFixed(2)}/kg (R$ ${(cepea?.price || 0)}/@), Tendência = ${cepea?.trend === 'up' ? 'Alta' : 'Baixa'}

4. Mercado Futuro B3 (Expectativa de Preços):
${(b3 || []).map((f: any) => `- ${f.month}: R$ ${f.price}/@ (R$ ${f.priceKg}/kg)`).join('\n')}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: dataPrompt
        });
        
        if (response.text) {
          aiSummary = response.text.trim();
        }
      } catch (geminiError) {
        console.error('Error generating AI market summary:', geminiError);
      }
    } else {
      console.warn('GEMINI_API_KEY is not defined in the environment. AI summary skipped.');
    }

    const syncResults = {
      cepea: cepea || { error: 'Failed' },
      scot: scot || { error: 'Failed' },
      b3: b3 || { error: 'Failed' },
      aiSummary: aiSummary,
      timestamp: new Date().toISOString()
    };

    // 4. Save to Local JSON
    await saveMarketData(syncResults);

    return NextResponse.json({ 
      success: true, 
      message: 'Indicadores e Resumo de IA sincronizados com sucesso!',
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

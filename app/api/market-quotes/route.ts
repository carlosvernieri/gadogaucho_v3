import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch all Plazas
    const { data: plazas, error: plazasError } = await (supabaseAdmin
      .from('auction_plazas') as any)
      .select('*')
      .order('name');

    if (plazasError) throw plazasError;

    const result = [];

    for (const plaza of plazas) {
      // 2. Fetch the latest 4 auctions for this plaza to build history
      const { data: plazaAuctions, error: auctionsError } = await (supabaseAdmin
        .from('auctions') as any)
        .select('id, auction_date')
        .eq('plaza_id', plaza.id)
        .order('auction_date', { ascending: false })
        .limit(4);

      if (auctionsError || !plazaAuctions || plazaAuctions.length === 0) continue;

      const latestAuction = plazaAuctions[0];
      
      // 3. Get offers for the LATEST auction
      const { data: latestOffers, error: offersError } = await (supabaseAdmin
        .from('auction_offers') as any)
        .select('category, price_kg')
        .eq('auction_id', latestAuction.id);

      if (offersError) continue;

      // Helper to calculate average for a plaza in a specific auction
      const calculateAverages = (offers: any[]) => {
        const categories = ['Vaca', 'Novilha', 'Terneira', 'Terneiro'];
        const avgs: any = {};
        
        categories.forEach(cat => {
          const filtered = offers.filter(o => o.category === cat);
          if (filtered.length > 0) {
            avgs[cat.toLowerCase()] = filtered.reduce((acc, curr) => acc + curr.price_kg, 0) / filtered.length;
          } else {
            avgs[cat.toLowerCase()] = 0;
          }
        });
        return avgs;
      };

      const currentAverages = calculateAverages(latestOffers || []);

      // 4. Build history for the chart (last 4 auctions)
      const history = [];
      // We process from oldest to newest for the chart
      for (const auction of [...plazaAuctions].reverse()) {
        const { data: histOffers } = await (supabaseAdmin
          .from('auction_offers') as any)
          .select('category, price_kg')
          .eq('auction_id', auction.id);
        
        const avgs = calculateAverages(histOffers || []);
        const dateObj = new Date(auction.auction_date);
        history.push({
          name: `${dateObj.getDate()}/${dateObj.getMonth() + 1}`,
          ...avgs
        });
      }

      result.push({
        cidade: `${plaza.name} (${plaza.city})`,
        ...currentAverages,
        tendencia: 'stable', // Simple logic for now or we could compare with previous auction
        history: history,
        lastUpdate: latestAuction.auction_date
      });
    }

    // Sort by city name
    result.sort((a, b) => a.cidade.localeCompare(b.cidade));

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Market quotes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

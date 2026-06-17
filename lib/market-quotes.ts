import { supabaseAdmin } from '@/lib/supabase';

export async function getMarketQuotes() {
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

      let latestOffers: any[] = [];
      let latestAuction = plazaAuctions[0];

      // Busca o leilão mais recente da praça que de fato possua ofertas cadastradas
      for (const auction of plazaAuctions) {
        const { data: offers, error: offersError } = await (supabaseAdmin
          .from('auction_offers') as any)
          .select('category, price_kg')
          .eq('auction_id', auction.id);

        if (!offersError && offers && offers.length > 0) {
          latestOffers = offers;
          latestAuction = auction;
          break;
        }
      }

      // Helper to calculate average for a plaza in a specific auction
      const calculateAverages = (offers: any[]) => {
        const categories = ['Vaca', 'Novilha', 'Novilho', 'Terneira', 'Terneiro'];
        const avgs: any = {};

        // Mapeamento para suportar tanto singular quanto plural do banco de dados
        const categoryMap: { [key: string]: string[] } = {
          vaca: ['vaca', 'vacas', 'vaca gorda', 'vaca descarte', 'vacas prenhes', 'vacas com cria', 'vaca prenha', 'vaca com cria'],
          novilha: ['novilha', 'novilhas'],
          novilho: ['novilho', 'novilhos'],
          terneira: ['terneira', 'terneiras'],
          terneiro: ['terneiro', 'terneiros']
        };
        
        categories.forEach(cat => {
          const catLower = cat.toLowerCase();
          const allowedNames = categoryMap[catLower] || [catLower];

          const filtered = offers.filter(o => {
            const offerCat = o.category?.toLowerCase()?.trim() || '';
            return allowedNames.includes(offerCat);
          });
          if (filtered.length > 0) {
            avgs[catLower] = filtered.reduce((acc, curr) => acc + (Number(curr.price_kg) || Number(curr.priceKg) || 0), 0) / filtered.length;
          } else {
            avgs[catLower] = 0;
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
        tendencia: 'stable', // Simple logic for now
        history: history,
        lastUpdate: latestAuction.auction_date
      });
    }

    // Sort by city name
    result.sort((a, b) => a.cidade.localeCompare(b.cidade));

    return result;

  } catch (error: any) {
    console.error('Market quotes error:', error);
    throw new Error(error.message);
  }
}

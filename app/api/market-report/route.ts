import { NextResponse } from 'next/server';
import { draftMode } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { getMarketData } from '@/lib/market-scraper';

// ISR desabilitado temporariamente (revalidate = 0 para forçar renderização dinâmica)
export const revalidate = 0;

export async function GET() {
  await draftMode();
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);

    // 0. Load Dynamic Data from Cache/Disk
    const dynamicMarketData = await getMarketData();

    // 1. Scot Consultoria Reference Data
    const scotData = dynamicMarketData?.scot || {
      pelotas: [
        { category: 'Boi Gordo', price: 11.70 },
        { category: 'Vaca Gorda', price: 10.85 },
        { category: 'Novilha', price: 11.25 },
      ],
      oeste: [
        { category: 'Boi Gordo', price: 11.70 },
        { category: 'Vaca Gorda', price: 11.15 },
        { category: 'Novilha', price: 11.40 },
      ]
    };

    // 2. B3 Futures Data
    const b3Futures = dynamicMarketData?.b3 || [
      { month: 'Abril/26', price: 363.00, priceKg: (363.00 / 30).toFixed(2) },
      { month: 'Maio/26', price: 351.60, priceKg: (351.60 / 30).toFixed(2) },
      { month: 'Junho/26', price: 341.40, priceKg: (341.40 / 30).toFixed(2) },
      { month: 'Julho/26', price: 337.05, priceKg: (337.05 / 30).toFixed(2) },
      { month: 'Agosto/26', price: 338.55, priceKg: (338.55 / 30).toFixed(2) },
      { month: 'Setembro/26', price: 341.50, priceKg: (341.50 / 30).toFixed(2) },
      { month: 'Outubro/26', price: 349.50, priceKg: (349.50 / 30).toFixed(2) },
    ];

    // 3. Indicador CEPEA
    const cepeaData = dynamicMarketData?.cepea || {
      price: 367.05,
      priceKg: (367.05 / 30).toFixed(2),
      trend: 'up',
      delta: 0.23
    };

    const categories = ['Vaca', 'Novilha', 'Boi Gordo', 'Terneiro', 'Terneira'];

    // 4. Get Averages using SQL RPC for high performance
    let dbStats: any = null;
    try {
      const { data, error } = await supabaseAdmin.rpc('get_market_averages', {
        target_date: today.toISOString()
      });
      if (!error) {
        dbStats = data;
      } else {
        console.error('RPC Error (get_market_averages):', error);
      }
    } catch (err) {
      console.error('RPC Exception:', err);
    }

    // Check if dbStats has auction averages
    const hasData = dbStats && Object.values(dbStats).some((val: any) => (val.auctionAvg || 0) > 0);

    if (!hasData) {
      console.log('SQL RPC returned no data or all zeros. Using JS fallback calculation.');
      
      const { data: auctions } = await supabaseAdmin.from('auctions').select('id, auction_date');
      const { data: offers } = await supabaseAdmin.from('auction_offers').select('auction_id, category, price_kg');
      const { data: listings } = await supabaseAdmin.from('listings').select('category, price_kg, created_at');

      const targetDate = new Date();
      const sevenDaysAgo = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(targetDate.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(targetDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const categoryMap: Record<string, string> = {
        'boi': 'Boi Gordo',
        'boi castrado': 'Boi Gordo',
        'bois': 'Boi Gordo',
        'novilho': 'Boi Gordo',
        'novilhos': 'Boi Gordo',
        'boi gordo': 'Boi Gordo',
        'vaca': 'Vaca',
        'vacas': 'Vaca',
        'vaca com cria': 'Vaca',
        'vacas com cria': 'Vaca',
        'vaca prenha': 'Vaca',
        'vacas prenhes': 'Vaca',
        'novilha': 'Novilha',
        'novilhas': 'Novilha',
        'terneiro': 'Terneiro',
        'terneiros': 'Terneiro',
        'terneira': 'Terneira',
        'terneiras': 'Terneira'
      };

      const stats: Record<string, { auctionAvg: number, prevAuctionAvg: number, platformAvg: number }> = {};
      categories.forEach(cat => {
        stats[cat] = { auctionAvg: 0, prevAuctionAvg: 0, platformAvg: 0 };
      });

      if (auctions && offers) {
        const currentAuctionIds = auctions.filter((a: any) => new Date(a.auction_date) >= sevenDaysAgo).map((a: any) => a.id);
        const prevAuctionIds = auctions.filter((a: any) => new Date(a.auction_date) >= fourteenDaysAgo && new Date(a.auction_date) < sevenDaysAgo).map((a: any) => a.id);

        // Current Auction Averages
        const currentOffers = offers.filter((o: any) => currentAuctionIds.includes(o.auction_id));
        categories.forEach(cat => {
          const catOffers = currentOffers.filter((o: any) => categoryMap[o.category?.toLowerCase()?.trim() || ''] === cat);
          const validPrices: number[] = catOffers.map((o: any) => Number(o.price_kg) || 0).filter((p: number) => p > 0);
          if (validPrices.length > 0) {
            stats[cat].auctionAvg = validPrices.reduce((sum: number, p: number) => sum + p, 0) / validPrices.length;
          }
        });

        // Previous Auction Averages
        const prevOffers = offers.filter((o: any) => prevAuctionIds.includes(o.auction_id));
        categories.forEach(cat => {
          const catOffers = prevOffers.filter((o: any) => categoryMap[o.category?.toLowerCase()?.trim() || ''] === cat);
          const validPrices: number[] = catOffers.map((o: any) => Number(o.price_kg) || 0).filter((p: number) => p > 0);
          if (validPrices.length > 0) {
            stats[cat].prevAuctionAvg = validPrices.reduce((sum: number, p: number) => sum + p, 0) / validPrices.length;
          }
        });
      }

      if (listings) {
        const recentListings = listings.filter((l: any) => new Date(l.created_at) >= thirtyDaysAgo);
        categories.forEach(cat => {
          const catListings = recentListings.filter((l: any) => categoryMap[l.category?.toLowerCase()?.trim() || ''] === cat);
          const validPrices: number[] = catListings.map((l: any) => Number(l.price_kg) || 0).filter((p: number) => p > 0);
          if (validPrices.length > 0) {
            stats[cat].platformAvg = validPrices.reduce((sum: number, p: number) => sum + p, 0) / validPrices.length;
          }
        });
      }

      dbStats = stats;
    }

    // Format the response and calculate trends
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

    // Read the pre-generated AI summary from the cached market data JSON
    const aiSummary = dynamicMarketData?.aiSummary || null;

    return NextResponse.json({
      reportDate: today.toISOString(),
      scotData,
      cepeaData,
      b3Futures,
      categoryStats,
      aiSummary
    });

  } catch (error: any) {
    console.error('Market report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

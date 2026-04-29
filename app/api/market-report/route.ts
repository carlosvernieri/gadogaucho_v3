import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getMarketData } from '@/lib/market-scraper';

export const dynamic = 'force-dynamic';

export async function GET() {
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
    const { data: dbStats, error } = await supabaseAdmin.rpc('get_market_averages', {
      target_date: today.toISOString()
    });

    if (error) {
      console.error('RPC Error (get_market_averages):', error);
      // Fallback in case the user hasn't run the SQL script yet
      throw new Error(`Failed to calculate averages via RPC. Make sure to run the get_market_averages SQL script. Details: ${error.message}`);
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

    return NextResponse.json({
      reportDate: today.toISOString(),
      scotData,
      cepeaData,
      b3Futures,
      categoryStats
    });

  } catch (error: any) {
    console.error('Market report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

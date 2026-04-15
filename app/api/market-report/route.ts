import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);

    // 1. Scot Consultoria Reference Data (Mocked from research)
    const scotData = {
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

    // 2. B3 Futures Data (Mocked from research)
    const b3Futures = [
      { month: 'Abril/26', price: 363.00, priceKg: (363.00 / 30).toFixed(2) },
      { month: 'Maio/26', price: 351.60, priceKg: (351.60 / 30).toFixed(2) },
      { month: 'Junho/26', price: 341.40, priceKg: (341.40 / 30).toFixed(2) },
      { month: 'Julho/26', price: 337.05, priceKg: (337.05 / 30).toFixed(2) },
      { month: 'Agosto/26', price: 338.55, priceKg: (338.55 / 30).toFixed(2) },
      { month: 'Setembro/26', price: 341.50, priceKg: (341.50 / 30).toFixed(2) },
      { month: 'Outubro/26', price: 349.50, priceKg: (349.50 / 30).toFixed(2) },
    ];

    const categories = ['Vaca', 'Novilha', 'Boi Gordo', 'Terneiro', 'Terneira'];

    // 3. Aggregate Auction Data (Last 7 days vs Previous 7 days)
    const { data: currentAuctions } = await (supabaseAdmin
      .from('auction_offers') as any)
      .select('price_kg, category, auctions(auction_date)')
      .gte('auctions.auction_date', sevenDaysAgo.toISOString());

    const { data: previousAuctions } = await (supabaseAdmin
      .from('auction_offers') as any)
      .select('price_kg, category, auctions(auction_date)')
      .gte('auctions.auction_date', fourteenDaysAgo.toISOString())
      .lt('auctions.auction_date', sevenDaysAgo.toISOString());

    // 4. Aggregate Platform Data (Last 7 days)
    const { data: platformOffers } = await (supabaseAdmin
      .from('listings') as any)
      .select('price_kg, category, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    // Helper to calculate average
    const calcAvg = (data: any[], cat: string) => {
      const filtered = data?.filter(item => item.category === cat) || [];
      if (filtered.length === 0) return 0;
      return filtered.reduce((acc, curr) => acc + curr.price_kg, 0) / filtered.length;
    };

    // Build Category Averages
    const categoryStats = categories.map(cat => {
      const auctionAvg = calcAvg(currentAuctions || [], cat);
      const prevAuctionAvg = calcAvg(previousAuctions || [], cat);
      const platformAvg = calcAvg(platformOffers || [], cat);
      
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
      b3Futures,
      categoryStats
    });

  } catch (error: any) {
    console.error('Market report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

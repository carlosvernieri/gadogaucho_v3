import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;

    // 1. Get the current listing info
    const { data: listing, error: listingError } = await (supabaseAdmin
      .from('listings') as any)
      .select('category, lat, lng')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listingCat = (listing as any).category?.trim();
    const listingLat = (listing as any).lat;
    const listingLng = (listing as any).lng;

    // 2. Find closest 3 plazas
    const { data: allPlazas, error: plazasError } = await (supabaseAdmin
      .from('auction_plazas') as any)
      .select('*');

    if (plazasError) throw plazasError;

    let closestPlazas = (allPlazas || [])
      .map((p: any) => ({
        ...p,
        distance: (listingLat && listingLng && p.lat && p.lng) 
          ? getDistance(listingLat, listingLng, p.lat, p.lng) 
          : 999999
      }))
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, 3);

    const plazaIds = closestPlazas.map((p: any) => p.id);
    const plazaMap = Object.fromEntries(closestPlazas.map((p: any) => [p.id, p.name]));

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // 3. Category Mapping (to match different names for the same animal type)
    // Normalize keys to lowercase to avoid case-sensitivity issues with listing category names (e.g. "TERNEIRA" vs "Terneira")
    const categoryMap: Record<string, string[]> = {
      'boi gordo': ['Boi Castrado', 'Novilho', 'Boi Gordo', 'Boi', 'Bois', 'Novilhos'],
      'vaca': ['Vaca', 'Vaca Gorda', 'Vaca Descarte', 'Vacas', 'Vacas Prenhes', 'Vacas com Cria'],
      'novilha': ['Novilha', 'Novilhas'],
      'terneiro': ['Terneiro', 'Terneiros'],
      'terneira': ['Terneira', 'Terneiras']
    };

    const targetCategories = categoryMap[listingCat.toLowerCase()] || [listingCat];

    // 4. Fetch auction offers for these categories in these plazas
    const { data: auctionData, error: auctionError } = await (supabaseAdmin
      .from('auction_offers') as any)
      .select(`
        price_kg,
        auction_id,
        auctions!inner (
          auction_date,
          plaza_id
        )
      `)
      .in('category', targetCategories)
      .in('auctions.plaza_id', plazaIds)
      .gte('auctions.auction_date', sixtyDaysAgo.toISOString());

    if (auctionError) console.error('Auction fetch error:', auctionError);

    // 5. Fetch platform listings for these categories
    const { data: platformData, error: platformError } = await (supabaseAdmin
      .from('listings') as any)
      .select('price_kg, created_at')
      .in('category', targetCategories)
      .gte('created_at', sixtyDaysAgo.toISOString());

    if (platformError) console.error('Platform fetch error:', platformError);

    // 6. Process data into weekly averages
    const getWeekKey = (dateStr: string) => {
      const date = new Date(dateStr);
      const day = date.getUTCDay();
      const dateNum = date.getUTCDate();
      const diff = dateNum - day;
      const startOfWeek = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
      return startOfWeek.toISOString().split('T')[0];
    };

    const weeksMap: Record<string, any> = {};

    // Initialize the last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      const key = getWeekKey(d.toISOString());
      weeksMap[key] = {
        week: new Date(key).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        plazas: Object.fromEntries(plazaIds.map((id: any) => [id, { total: 0, count: 0 }])),
        platformTotal: 0,
        platformCount: 0
      };
    }

    // Aggregate Auction data
    auctionData?.forEach((offer: any) => {
      const date = offer.auctions?.auction_date;
      const plazaId = offer.auctions?.plaza_id;
      if (!date || !plazaId) return;
      const key = getWeekKey(date);
      if (weeksMap[key] && weeksMap[key].plazas[plazaId]) {
        weeksMap[key].plazas[plazaId].total += offer.price_kg;
        weeksMap[key].plazas[plazaId].count += 1;
      }
    });

    // Aggregate Platform data
    platformData?.forEach((item: any) => {
      const key = getWeekKey(item.created_at);
      if (weeksMap[key]) {
        weeksMap[key].platformTotal += item.price_kg;
        weeksMap[key].platformCount += 1;
      }
    });

    // 7. Check if we have ANY data. If not, provide realistic mock data fallback
    const hasAnyData = (auctionData && auctionData.length > 0) || (platformData && platformData.length > 0);

    if (!hasAnyData) {
      console.log('No database data found for insight. Generating mock fallback...');
      const basePrice = (listing as any).price_kg || 11.50;
      
      // If we don't even have plazas, add some mock ones
      if (closestPlazas.length === 0) {
        closestPlazas = [
          { id: 101, name: 'Butiá', distance: 45 },
          { id: 102, name: 'Santa Ursula', distance: 62 },
          { id: 103, name: 'Pelotas', distance: 120 }
        ];
      }

      Object.keys(weeksMap).forEach((key, idx) => {
        const w = weeksMap[key];
        const weekFactor = 1 + (Math.sin(idx * 0.5) * 0.05); // Subtle trend
        
        closestPlazas.forEach((p: any) => {
          const plazaFactor = 0.95 + (Math.random() * 0.1); // Small variation per plaza
          w.plazas[p.id] = {
            total: basePrice * weekFactor * plazaFactor,
            count: 1
          };
        });

        w.platformTotal = basePrice * weekFactor;
        w.platformCount = 1;
      });
    }

    // Convert to Chart Data
    const chartData = Object.entries(weeksMap).map(([key, w]) => {
      const entry: any = { name: w.week };
      closestPlazas.forEach((p: any, idx: number) => {
        const plazaStats = w.plazas[p.id];
        entry[`plaza${idx + 1}`] = plazaStats?.count > 0 ? parseFloat((plazaStats.total / plazaStats.count).toFixed(2)) : null;
        entry[`plazaName${idx + 1}`] = p.name;
      });
      entry.platformPrice = w.platformCount > 0 ? parseFloat((w.platformTotal / w.platformCount).toFixed(2)) : null;
      return entry;
    });

    // Convert to Table Data (last 4 weeks)
    const tableData = Object.values(weeksMap).slice(-4).map((w: any) => ({
      week: w.week,
      plazas: closestPlazas.map((p: any, idx: number) => ({
        name: p.name,
        price: w.plazas[p.id]?.count > 0 ? (w.plazas[p.id].total / w.plazas[p.id].count) : null
      })),
      platformPrice: w.platformCount > 0 ? (w.platformTotal / w.platformCount) : null
    })).reverse();

    return NextResponse.json({
      category: listingCat,
      chartData,
      tableData,
      closestPlazas: closestPlazas.map((p: any) => ({ id: p.id, name: p.name, distance: typeof p.distance === 'number' ? Math.round(p.distance) : 0 })),
      isMock: !hasAnyData
    });

  } catch (error: any) {
    console.error('Price insight error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

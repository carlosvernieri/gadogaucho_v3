const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getWeekKey = (dateStr) => {
    const date = new Date(dateStr);
    const diff = date.getDate() - date.getDay();
    const startOfWeek = new Date(date.setDate(diff));
    return startOfWeek.toISOString().split('T')[0];
};

async function debugAPI(id) {
    console.log(`--- Debugging Insight API for ID: ${id} ---`);
    
    // 1. Get the current listing info
    const { data: listing } = await supabase.from('listings').select('category, lat, lng').eq('id', id).single();
    if (!listing) return console.log('Listing not found');
    
    console.log('Listing:', listing);

    const listingCat = listing.category.trim();
    const listingLat = listing.lat;
    const listingLng = listing.lng;

    // 2. Find closest 3 plazas
    const { data: allPlazas } = await supabase.from('auction_plazas').select('*');
    let closestPlazas = (allPlazas || [])
      .map((p) => ({
        ...p,
        distance: (listingLat && listingLng && p.lat && p.lng) 
          ? getDistance(listingLat, listingLng, p.lat, p.lng) 
          : 999999
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    const plazaIds = closestPlazas.map((p) => p.id);
    console.log('Plaza IDs:', plazaIds);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // 3. Fetch auction offers
    const { data: auctionData, error: auctionError } = await supabase
      .from('auction_offers')
      .select(`
        price_kg,
        auction_id,
        auctions!inner (
          auction_date,
          plaza_id
        )
      `)
      .ilike('category', listingCat)
      .in('auctions.plaza_id', plazaIds)
      .gte('auctions.auction_date', sixtyDaysAgo.toISOString());

    if (auctionError) return console.log('Auction Error:', auctionError);
    console.log(`Auction Data rows: ${auctionData?.length || 0}`);

    // 4. Process
    const weeksMap = {};
    for (let i = 7; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - (i * 7));
        const key = getWeekKey(d.toISOString());
        weeksMap[key] = { 
          week: new Date(key).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 
          plazas: Object.fromEntries(plazaIds.map((id) => [id, { total: 0, count: 0 }])),
          platformTotal: 0, 
          platformCount: 0 
        };
    }
    console.log('WeeksMap Keys:', Object.keys(weeksMap));

    let matchedOffers = 0;
    auctionData?.forEach((offer) => {
        const date = offer.auctions?.auction_date;
        const plazaId = offer.auctions?.plaza_id;
        if (!date || !plazaId) return;
        const key = getWeekKey(date);
        if (weeksMap[key]) {
            matchedOffers++;
            if (weeksMap[key].plazas[plazaId]) {
                weeksMap[key].plazas[plazaId].total += offer.price_kg;
                weeksMap[key].plazas[plazaId].count += 1;
            }
        } else {
            // console.log(`No week matching ${key} at date ${date}`);
        }
    });

    console.log(`Matched Offers: ${matchedOffers}/${auctionData?.length}`);
    
    // Check one mismatch sample if any
    if (matchedOffers < (auctionData?.length || 0)) {
        const unmatched = auctionData.find(o => !weeksMap[getWeekKey(o.auctions.auction_date)]);
        if (unmatched) {
            console.log('Unmatched sample date:', unmatched.auctions.auction_date, '-> key:', getWeekKey(unmatched.auctions.auction_date));
        }
    }
}

debugAPI(94);

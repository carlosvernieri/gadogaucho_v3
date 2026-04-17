const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and Key are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function explore() {
  console.log('--- Plazas ---');
  const { data: plazas, error: plazasError } = await supabase.from('auction_plazas').select('*');
  if (plazasError) console.error(plazasError);
  else console.log(plazas);

  console.log('\n--- Auctions (Last 4 Weeks) ---');
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const { data: auctions, error: auctionsError } = await supabase
    .from('auctions')
    .select('*, plaza:auction_plazas(name)')
    .gte('auction_date', fourWeeksAgo.toISOString())
    .order('auction_date', { ascending: false });
    
  if (auctionsError) console.error(auctionsError);
  else console.log(auctions);

  console.log('\n--- Offer Count (Last 4 Weeks) ---');
  // Since we can't easily join in a simple count query without proper relations defined in supabase client types, 
  // we'll just fetch all offers and filter or join.
  const { data: offers, error: offersError } = await supabase
    .from('auction_offers')
    .select('id, auction_id');

  if (offersError) console.error(offersError);
  else {
      // Fetch associated auctions to filter by date
      const { data: relatedAuctions } = await supabase
          .from('auctions')
          .select('id')
          .gte('auction_date', fourWeeksAgo.toISOString());
      
      const validAuctionIds = new Set(relatedAuctions?.map(a => a.id));
      const filteredOffers = offers.filter(o => validAuctionIds.has(o.auction_id));
      console.log(`Total offers in last 4 weeks: ${filteredOffers.length}`);
  }
}

explore();

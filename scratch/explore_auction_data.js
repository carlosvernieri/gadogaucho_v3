const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function exploreData() {
  console.log('--- Exploring auction_offers ---');
  const { data: offers, error: offersError } = await supabase
    .from('auction_offers')
    .select('*, auctions(auction_date)')
    .limit(10);
    
  if (offersError) console.error(offersError);
  else console.log('Offers Sample:', JSON.stringify(offers, null, 2));

  console.log('--- Unique Cities in auction_offers ---');
  const { data: cities, error: citiesError } = await supabase
    .from('auction_offers')
    .select('seller_city');
    
  if (citiesError) console.error(citiesError);
  else {
    const uniqueCities = [...new Set(cities.map(c => c.seller_city))];
    console.log('Unique Cities:', uniqueCities);
  }
}

exploreData();

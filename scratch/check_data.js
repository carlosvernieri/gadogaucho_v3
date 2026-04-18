const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and Key are required in .env.local');
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
  // Need to join via auctions
  const { data: offers, error: offersError } = await supabase
    .from('auction_offers')
    .select('id, auctions!inner(auction_date)')
    .gte('auctions.auction_date', fourWeeksAgo.toISOString());

  if (offersError) console.error(offersError);
  else console.log(`Total offers in last 4 weeks: ${offers?.length || 0}`);
}

explore();

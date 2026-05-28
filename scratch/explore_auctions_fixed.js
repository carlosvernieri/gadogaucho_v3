const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = value;
      } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
        supabaseKey = value;
      }
    }
  }
} catch (e) {
  console.error('Failed to load env:', e);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Check auctions dates
  const { data: auctions, error: auctionsErr } = await supabase
    .from('auctions')
    .select('id, auction_date, plaza_id');
  
  console.log('--- Auctions in Database ---');
  if (auctionsErr) {
    console.error(auctionsErr);
  } else {
    console.log(`Total auctions: ${auctions.length}`);
    console.log(auctions.map(a => `${a.id}: Date=${a.auction_date}, Plaza=${a.plaza_id}`));
  }

  // Check listings dates
  const { data: listings, error: listingsErr } = await supabase
    .from('listings')
    .select('id, created_at, category');

  console.log('\n--- Listings in Database ---');
  if (listingsErr) {
    console.error(listingsErr);
  } else {
    console.log(`Total listings: ${listings.length}`);
    const sorted = listings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    console.log('Latest 5 listings:');
    sorted.slice(0, 5).forEach(l => console.log(`${l.id}: CreatedAt=${l.created_at}, Category=${l.category}`));
  }
}

run();

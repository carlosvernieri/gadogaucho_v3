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
  const targetDate = new Date('2026-05-28T15:17:03.985Z');
  const sevenDaysAgo = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  console.log('Target Date:', targetDate.toISOString());
  console.log('Seven Days Ago:', sevenDaysAgo.toISOString());

  // Let's fetch all auctions and see their date strings
  const { data: auctions } = await supabase.from('auctions').select('id, auction_date');
  console.log('\nAll Auctions:');
  auctions.forEach(a => {
    const d = new Date(a.auction_date);
    console.log(`ID: ${a.id}, Date: ${a.auction_date}, Parsed Date: ${d.toISOString()}, is >= sevenDaysAgo? ${d >= sevenDaysAgo}`);
  });

  // Let's query auction_offers for the auctions matching the criteria
  const matchingAuctionIds = auctions.filter(a => new Date(a.auction_date) >= sevenDaysAgo).map(a => a.id);
  console.log('\nMatching Auction IDs:', matchingAuctionIds);

  const { data: offers } = await supabase
    .from('auction_offers')
    .select('id, auction_id, category, price_kg')
    .in('auction_id', matchingAuctionIds);

  console.log(`\nFound ${offers?.length || 0} offers for matching auctions.`);
  if (offers && offers.length > 0) {
    console.log('Sample matching offers:', offers.slice(0, 5));
  }
}

run();

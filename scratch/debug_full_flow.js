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
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      else if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value;
    }
  }
} catch (e) {
  console.error('Failed to load env:', e);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Step 1: List all auctions
  console.log('========== ALL AUCTIONS ==========');
  const { data: auctions, error: e1 } = await supabase
    .from('auctions')
    .select('*');
  if (e1) { console.error('Error auctions:', e1); return; }
  console.log(`Found ${auctions.length} auctions:`);
  auctions.forEach(a => {
    console.log(`  ID=${a.id}  date=${a.auction_date}  plaza_id=${a.plaza_id}  created=${a.created_at}`);
  });

  // Step 2: List all auction_plazas
  console.log('\n========== ALL PLAZAS ==========');
  const { data: plazas, error: e2 } = await supabase
    .from('auction_plazas')
    .select('*');
  if (e2) { console.error('Error plazas:', e2); return; }
  plazas.forEach(p => {
    console.log(`  ID=${p.id}  name=${p.name}  city=${p.city}`);
  });

  // Step 3: List all auction_offers
  console.log('\n========== ALL AUCTION OFFERS ==========');
  const { data: offers, error: e3 } = await supabase
    .from('auction_offers')
    .select('*');
  if (e3) { console.error('Error offers:', e3); return; }
  console.log(`Found ${offers.length} offers total`);
  offers.forEach(o => {
    console.log(`  ID=${o.id}  auction_id=${o.auction_id}  cat=${o.category}  price_kg=${o.price_kg}  avg_weight=${o.avg_weight}  batch=${o.batch_size}`);
  });

  // Step 4: Test the join query that the API uses
  console.log('\n========== JOIN TEST: auction:auctions(...) ==========');
  const { data: joinTest, error: e4 } = await supabase
    .from('auction_offers')
    .select('*, auction:auctions(id, auction_date, plaza_id, plaza:auction_plazas(name))')
    .limit(5);
  if (e4) {
    console.error('Join query ERROR:', e4);
  } else {
    console.log('Join test result (first 5):');
    joinTest.forEach(o => {
      console.log(`  offer_id=${o.id}  auction_id=${o.auction_id}  auction_field=${JSON.stringify(o.auction)}`);
    });
  }

  // Step 5: Simulate the date filter logic
  console.log('\n========== DATE FILTER SIMULATION (14d) ==========');
  const now = new Date();
  console.log(`Current date: ${now.toISOString()}`);
  
  const cutoff14 = new Date();
  cutoff14.setDate(cutoff14.getDate() - 14);
  cutoff14.setHours(0, 0, 0, 0);
  console.log(`14-day cutoff: ${cutoff14.toISOString()}`);
  
  for (const a of auctions) {
    const dateStr = String(a.auction_date).replace(' ', 'T');
    const auctionTime = new Date(dateStr).getTime();
    const passes = !isNaN(auctionTime) && auctionTime >= cutoff14.getTime();
    console.log(`  Auction ${a.id}: date="${a.auction_date}" => parsed=${new Date(dateStr).toISOString()} passes14d=${passes}`);
  }
  
  // Step 6: Count how many offers should pass
  const auctionMap = {};
  auctions.forEach(a => { auctionMap[a.id] = a; });
  
  let countPass = 0;
  let countFailDate = 0;
  let countFailWeight = 0;
  let countFailNoAuction = 0;
  
  for (const o of offers) {
    const weight = Number(o.avg_weight);
    const priceKg = Number(o.price_kg);
    if (isNaN(weight) || weight <= 0 || isNaN(priceKg) || priceKg <= 0) {
      countFailWeight++;
      continue;
    }
    const auction = auctionMap[o.auction_id];
    if (!auction) {
      countFailNoAuction++;
      continue;
    }
    const dateStr = String(auction.auction_date).replace(' ', 'T');
    const auctionTime = new Date(dateStr).getTime();
    if (isNaN(auctionTime) || auctionTime < cutoff14.getTime()) {
      countFailDate++;
      continue;
    }
    countPass++;
  }
  
  console.log(`\nResults for 14d filter:`);
  console.log(`  PASS: ${countPass}`);
  console.log(`  FAIL (weight/price): ${countFailWeight}`);
  console.log(`  FAIL (no auction match): ${countFailNoAuction}`);
  console.log(`  FAIL (date out of range): ${countFailDate}`);
}

run().catch(console.error);

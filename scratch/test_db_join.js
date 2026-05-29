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

const categoryMap = {
  'Boi Castrado': 'Boi Gordo', 'Novilho': 'Boi Gordo', 'Boi Gordo': 'Boi Gordo', 'Bois': 'Boi Gordo', 'Novilhos': 'Boi Gordo',
  'Vaca': 'Vaca', 'Vaca Gorda': 'Vaca', 'Vaca Descarte': 'Vaca', 'Vacas': 'Vaca', 'Vacas Prenhes': 'Vaca', 'Vacas com Cria': 'Vaca',
  'Novilha': 'Novilha', 'Novilhas': 'Novilha',
  'Terneiro': 'Terneiro', 'Terneiros': 'Terneiro',
  'Terneira': 'Terneira', 'Terneiras': 'Terneira'
};

async function run() {
  const targetDate = new Date();
  const sevenDaysAgo = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(targetDate.getTime() - 14 * 24 * 60 * 60 * 1000);

  const { data: auctions } = await supabase.from('auctions').select('*');
  const { data: offers } = await supabase.from('auction_offers').select('*');

  console.log(`Auctions: ${auctions.length}, Offers: ${offers.length}`);

  // Current
  const currentAuctions = auctions.filter(a => new Date(a.auction_date) >= sevenDaysAgo);
  const currentAuctionIds = currentAuctions.map(a => a.id);
  const currentOffers = offers.filter(o => currentAuctionIds.includes(o.auction_id));

  console.log(`\nCurrent Auctions (last 7 days):`, currentAuctions.map(a => `${a.id}: ${a.auction_date}`));
  console.log(`Offers in current auctions: ${currentOffers.length}`);

  // Calculate averages for current
  const currentAvgs = {};
  currentOffers.forEach(o => {
    const cat = categoryMap[o.category?.trim()];
    if (cat) {
      if (!currentAvgs[cat]) currentAvgs[cat] = { sum: 0, count: 0 };
      const val = parseFloat(o.price_kg) || 0;
      if (val > 0) {
        currentAvgs[cat].sum += val;
        currentAvgs[cat].count++;
      }
    }
  });

  console.log('Current Averages:');
  Object.keys(currentAvgs).forEach(cat => {
    const avg = currentAvgs[cat].count > 0 ? (currentAvgs[cat].sum / currentAvgs[cat].count).toFixed(2) : 0;
    console.log(`- ${cat}: ${avg} (count: ${currentAvgs[cat].count})`);
  });

  // Previous
  const prevAuctions = auctions.filter(a => new Date(a.auction_date) >= fourteenDaysAgo && new Date(a.auction_date) < sevenDaysAgo);
  const prevAuctionIds = prevAuctions.map(a => a.id);
  const prevOffers = offers.filter(o => prevAuctionIds.includes(o.auction_id));

  console.log(`\nPrevious Auctions (7-14 days ago):`, prevAuctions.map(a => `${a.id}: ${a.auction_date}`));
  console.log(`Offers in previous auctions: ${prevOffers.length}`);

  // Calculate averages for previous
  const prevAvgs = {};
  prevOffers.forEach(o => {
    const cat = categoryMap[o.category?.trim()];
    if (cat) {
      if (!prevAvgs[cat]) prevAvgs[cat] = { sum: 0, count: 0 };
      const val = parseFloat(o.price_kg) || 0;
      if (val > 0) {
        prevAvgs[cat].sum += val;
        prevAvgs[cat].count++;
      }
    }
  });

  console.log('Previous Averages:');
  Object.keys(prevAvgs).forEach(cat => {
    const avg = prevAvgs[cat].count > 0 ? (prevAvgs[cat].sum / prevAvgs[cat].count).toFixed(2) : 0;
    console.log(`- ${cat}: ${avg} (count: ${prevAvgs[cat].count})`);
  });
}

run();

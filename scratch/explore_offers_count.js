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
  const { data, error } = await supabase
    .from('auction_offers')
    .select('auction_id, price_kg');

  if (error) {
    console.error(error);
    return;
  }

  const stats = {};
  data.forEach(o => {
    if (!stats[o.auction_id]) {
      stats[o.auction_id] = { count: 0, sum: 0 };
    }
    const val = parseFloat(o.price_kg) || 0;
    if (val > 0) {
      stats[o.auction_id].count++;
      stats[o.auction_id].sum += val;
    }
  });

  console.log('Auction offers stats by auction_id (where price > 0):');
  Object.keys(stats).forEach(id => {
    const avg = stats[id].count > 0 ? (stats[id].sum / stats[id].count).toFixed(2) : 0;
    console.log(`Auction ${id}: Count=${stats[id].count}, Average Price/kg=R$ ${avg}`);
  });
}

run();

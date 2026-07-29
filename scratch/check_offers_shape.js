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

async function checkOffers() {
  const { data: offers, error } = await supabase
    .from('auction_offers')
    .select('*, auction:auctions(id, auction_date, plaza_id, plaza:auction_plazas(name))')
    .order('id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total offers count:', offers.length);
  offers.forEach((o, i) => {
    console.log(`Offer #${i + 1} (id: ${o.id}):`);
    console.log('  category:', o.category);
    console.log('  avg_weight:', o.avg_weight);
    console.log('  price_kg:', o.price_kg);
    console.log('  auction raw type:', typeof o.auction, Array.isArray(o.auction) ? 'ARRAY' : 'OBJECT');
    console.log('  auction content:', JSON.stringify(o.auction));
  });
}

checkOffers();

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
    .select('id, category, price_kg')
    .eq('auction_id', 21);

  if (error) {
    console.error(error);
    return;
  }

  console.log('Auction 21 offers counts by category:');
  const catCounts = {};
  data.forEach(o => {
    catCounts[o.category] = (catCounts[o.category] || 0) + 1;
  });
  console.log(catCounts);
  console.log('Sample offers:', data.slice(0, 10));
}

run();

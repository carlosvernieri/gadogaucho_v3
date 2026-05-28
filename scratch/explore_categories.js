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
  const { data: listings } = await supabase.from('listings').select('category').limit(100);
  const listingCats = [...new Set(listings.map(l => l.category))];
  console.log('Listings unique categories (case-sensitive):', listingCats);

  const { data: offers } = await supabase.from('auction_offers').select('category').limit(100);
  const offerCats = [...new Set(offers.map(o => o.category))];
  console.log('Auction offers unique categories (case-sensitive):', offerCats);
}

run();

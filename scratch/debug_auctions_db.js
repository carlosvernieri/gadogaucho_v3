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

async function debugAll() {
  console.log('=== 1. AUCTIONS TABLE ===');
  const { data: auctions, error: err1 } = await supabase.from('auctions').select('*, plaza:auction_plazas(name)');
  if (err1) console.error('Err auctions:', err1);
  else console.log(JSON.stringify(auctions, null, 2));

  console.log('\n=== 2. AUCTION OFFERS TABLE ===');
  const { data: offers, error: err2 } = await supabase
    .from('auction_offers')
    .select('*, auction:auctions(id, auction_date, plaza_id, plaza:auction_plazas(name))');
  if (err2) console.error('Err offers:', err2);
  else console.log(JSON.stringify(offers, null, 2));
}

debugAll();

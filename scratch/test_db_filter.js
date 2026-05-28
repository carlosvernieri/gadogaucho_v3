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
  const targetDate = new Date();
  const sevenDaysAgo = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('auctions')
    .select('id, auction_date')
    .gte('auction_date', sevenDaysAgo.toISOString());

  console.log('Error:', error);
  console.log('Matching auctions in DB filter:', data);
}

run();

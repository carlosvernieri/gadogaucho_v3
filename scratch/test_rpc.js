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
  const today = new Date();
  console.log('Calling get_market_averages with target_date:', today.toISOString());
  const { data, error } = await supabase.rpc('get_market_averages', {
    target_date: today.toISOString()
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Result:', JSON.stringify(data, null, 2));
  }
}

run();

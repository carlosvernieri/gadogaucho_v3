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
    .rpc('get_market_averages', { target_date: new Date().toISOString() });

  console.log('Direct test result:', data, error);

  // Let's run a query to get pg_proc definition
  const { data: proc, error: procErr } = await supabase
    .from('pg_proc')
    .select('proname, prosrc')
    .eq('proname', 'get_market_averages');

  if (procErr) {
    console.error('Error fetching pg_proc:', procErr);
  } else {
    console.log('pg_proc result count:', proc?.length);
    if (proc && proc.length > 0) {
      console.log('Function Definition:');
      console.log(proc[0].prosrc);
    } else {
      console.log('No function found in pg_proc (might be because of schema permissions)');
    }
  }
}

run();

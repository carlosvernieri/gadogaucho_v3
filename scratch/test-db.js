const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    process.env[key] = value;
  }
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  try {
    console.log('Fetching users...');
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Error:', error);
    } else {
      console.log(`Fetched ${users.length} users:`);
      users.forEach(u => {
        console.log(`- ID: ${u.id}, Email: ${u.email}, Name: ${u.name || u.full_name}, Role: ${u.role}`);
      });
    }

    console.log('\nFetching saved simulations counts by user_id...');
    const { data: sims, error: simsError } = await supabase
      .from('saved_simulations')
      .select('user_id, calculator_type');
    
    if (simsError) {
      console.error('Sims error:', simsError);
    } else {
      const counts = {};
      sims.forEach(s => {
        counts[s.user_id] = (counts[s.user_id] || 0) + 1;
      });
      console.log('Simulations count per user_id:', counts);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkListing() {
  console.log('Querying listing with ID 110...');
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', 110)
    .maybeSingle();

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  if (!data) {
    console.log('No listing found with ID 110.');
    return;
  }

  console.log('Listing 110 data found:');
  console.log(JSON.stringify(data, null, 2));
}

checkListing().catch(console.error);

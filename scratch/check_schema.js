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

async function checkSchema() {
  console.log('Querying schema for public.users...');
  
  // Since we don't have a direct raw SQL executor, we can select a dummy table if it exists. 
  // Instead of database catalog, let's just query a record and print its type.
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (data && data[0]) {
    console.log('Data types of columns:');
    for (const [key, value] of Object.entries(data[0])) {
      console.log(`- ${key}: value=${value}, type=${typeof value}`);
    }
  } else {
    console.log('No data found in public.users or error:', error);
  }
}

checkSchema().catch(console.error);

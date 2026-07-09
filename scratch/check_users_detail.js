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

async function checkUsers() {
  const ids = ['8af27169-1141-460f-8b24-d8a2956a578b', '6253fe09-4659-405c-a957-57019287c92d'];
  for (const id of ids) {
    console.log(`Checking public.users for ID: ${id}...`);
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error(`Error for ${id}:`, error);
    } else {
      console.log(`Data for ${id}:`, data);
    }
  }
}

checkUsers().catch(console.error);

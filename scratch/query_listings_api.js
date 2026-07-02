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

async function runQueries() {
  console.log('--- Query 1: standard list query with users join ---');
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*, users(name, verified)')
    .or('sold.eq.false,sold.is.null')
    .order('featured', { ascending: false })
    .order('id', { ascending: false })
    .range(0, 19);

  if (error) {
    console.error('Error standard query:', error);
  } else {
    console.log(`Standard query returned ${listings.length} listings.`);
    const found = listings.find(l => l.id === 110);
    console.log('Is ID 110 in standard query?', found ? 'YES' : 'NO');
    if (!found) {
      // let's print all returned IDs
      console.log('Returned IDs:', listings.map(l => l.id));
    }
  }

  console.log('\n--- Query 2: Listing 110 User info ---');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', '8af27169-1141-460f-8b24-d8a2956a578b')
    .maybeSingle();

  if (userError) {
    console.error('Error fetching user:', userError);
  } else {
    console.log('User of listing 110:', user);
  }
}

runQueries().catch(console.error);

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables manually
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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase config:', { supabaseUrl, supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch(searchVal) {
  console.log(`\n--- Testing search for: "${searchVal}" ---`);
  
  // 1. Find matching users by name
  let matchingUserIds = [];
  if (isNaN(Number(searchVal))) {
    const { data: usersData, error: usersErr } = await supabase
      .from('users')
      .select('id, name')
      .ilike('name', `%${searchVal}%`);

    if (usersErr) {
      console.error('Error fetching users:', usersErr);
    } else {
      matchingUserIds = usersData.map(u => u.id);
      console.log(`Found ${matchingUserIds.length} matching users:`, usersData);
    }
  }

  // 2. Query listings using OR
  let orConditions = [];
  
  // Title matches search term
  orConditions.push(`title.ilike.%${searchVal}%`);
  
  // If searchVal is numeric, match ID
  if (!isNaN(Number(searchVal))) {
    orConditions.push(`id.eq.${searchVal}`);
  }
  
  // If we found matching users, match user_id in those IDs
  if (matchingUserIds.length > 0) {
    orConditions.push(`user_id.in.(${matchingUserIds.join(',')})`);
  }

  console.log('OR conditions generated:', orConditions.join(','));

  const { data: listingsData, error: listingsErr } = await supabase
    .from('listings')
    .select('id, title, user_id, users(name)')
    .or(orConditions.join(','))
    .limit(5);

  if (listingsErr) {
    console.error('Error running listings query:', listingsErr);
  } else {
    console.log('Listings search succeeded! Results found:', listingsData.length);
    console.log('Sample:', JSON.stringify(listingsData, null, 2));
  }
}

async function run() {
  await testSearch('admin'); // Should find listings owned by admin or containing 'admin'
  await testSearch('94');    // Should find listing with ID 94
  await testSearch('terneira'); // Should find listings with 'terneira' in title
}

run();

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

async function testSearch() {
  const searchVal = 'admin'; // Testing string search
  
  console.log('Testing text search (title or users.name):');
  const { data: textData, error: textErr } = await supabase
    .from('listings')
    .select('id, title, users!inner(name)') // Note: in PostgREST, we can use !inner to force an inner join if needed, but users(name) is standard
    .or(`title.ilike.%${searchVal}%,users.name.ilike.%${searchVal}%`)
    .limit(5);

  if (textErr) {
    console.error('Error running text search:', textErr);
  } else {
    console.log('Text search succeeded! Results found:', textData.length);
    console.log('Sample:', JSON.stringify(textData, null, 2));
  }

  const numericVal = '94'; // Testing numeric search (title, users.name, or id)
  console.log('\nTesting numeric search (title, users.name, or id):');
  const { data: numData, error: numErr } = await supabase
    .from('listings')
    .select('id, title, users(name)')
    .or(`title.ilike.%${numericVal}%,id.eq.${numericVal},users.name.ilike.%${numericVal}%`)
    .limit(5);

  if (numErr) {
    console.error('Error running numeric search:', numErr);
  } else {
    console.log('Numeric search succeeded! Results found:', numData.length);
    console.log('Sample:', JSON.stringify(numData, null, 2));
  }
}

testSearch();

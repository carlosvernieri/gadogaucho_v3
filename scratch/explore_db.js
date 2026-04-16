const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role to list tables if possible via RPC or just metadata

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  // Since we can't easily list tables via supabase-js without an RPC, 
  // let's try to query common tables to see if they exist and their structure.
  const tables = ['auctions', 'auction_offers', 'listings', 'users', 'quotes'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`Table: ${table}`);
    if (error) {
      console.log(`  Error: ${error.message}`);
    } else {
      console.log(`  Columns: ${Object.keys(data[0] || {}).join(', ')}`);
      console.log(`  Count: ${data.length}`);
    }
  }
}

listTables();

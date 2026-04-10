const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('get_listings_within_radius', {
    target_lat: -29,
    target_lng: -53,
    max_distance_km: 100,
    category_filter: null,
    search_filter: null,
    offset_val: 0,
    limit_val: 20
  });

  console.log('Data:', data);
  console.log('Error:', error);
}

test();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
  const { data, error } = await supabase.rpc('get_listings_within_radius'); // Not with args, let's just run a raw query
  // Wait, no raw query allowed easily from client.
  // We can just fetch the type of each column for 'listings' and 'users' table via pg_meta or through a RPC if there's one.
  // Better yet, I can write a small bash script that uses the supabase CLI if it exists: `npx supabase db psql` no, project might not be linked.
  // So how to get the column types?
  // Supabase REST API `GET /rest/v1/?apikey=...` returns the swagger definition. Let's fetch it!
}

async function fetchSwagger() {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const swagger = await res.json();
    const listingsProps = swagger.definitions.listings.properties;
    console.log("listings.user_id type:", listingsProps.user_id.type, listingsProps.user_id.format);
}

fetchSwagger();

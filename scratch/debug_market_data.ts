import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Checking auction_plazas...');
  const { data: plazas, error: plazasErr } = await supabase.from('auction_plazas').select('*').limit(5);
  console.log('Plazas:', plazas?.length || 0, plazasErr || '');

  console.log('Checking auction_offers...');
  const { data: offers, error: offersErr } = await supabase.from('auction_offers').select('*').limit(5);
  console.log('Offers:', offers?.length || 0, offersErr || '');

  console.log('Checking auctions...');
  const { data: auctions, error: auctionsErr } = await supabase.from('auctions').select('*').limit(5);
  console.log('Auctions:', auctions?.length || 0, auctionsErr || '');

  console.log('Checking listings...');
  const { data: listings, error: listingsErr } = await supabase.from('listings').select('id, category, lat, lng').eq('id', 89).single();
  console.log('Listing 89:', listings, listingsErr || '');
  
  if (listings) {
      console.log('Checking matching offers for category:', listings.category);
      const { data: matchOffers, error: matchErr } = await supabase
        .from('auction_offers')
        .select('id, category')
        .ilike('category', listings.category.trim())
        .limit(5);
      console.log('Matching offers:', matchOffers?.length || 0, matchErr || '');
      if (matchOffers && matchOffers.length > 0) {
          console.log('Sample match:', matchOffers[0]);
      }
  }
}

checkData();

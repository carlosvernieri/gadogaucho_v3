const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuctions() {
  console.log('=== Registered Plazas ===');
  const { data: plazas, error: plazasError } = await supabase.from('auction_plazas').select('*');
  if (plazasError) {
    console.error('Error fetching plazas:', plazasError);
    return;
  }
  console.log(plazas);

  console.log('\n=== Auctions in the database (last 60 days) ===');
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: auctions, error: auctionsError } = await supabase
    .from('auctions')
    .select(`
      id,
      auction_date,
      video_url,
      auction_plazas ( id, name )
    `)
    .gte('auction_date', sixtyDaysAgo.toISOString())
    .order('auction_date', { ascending: false });

  if (auctionsError) {
    console.error('Error fetching auctions:', auctionsError);
    return;
  }
  
  auctions.forEach(a => {
    console.log(`- Date: ${a.auction_date} | Plaza: ${a.auction_plazas?.name} (ID: ${a.auction_plazas?.id}) | URL: ${a.video_url}`);
  });
}

checkAuctions();

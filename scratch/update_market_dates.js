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

async function run() {
  console.log('--- Updating Listings created_at dates ---');
  // Update all listings to be created 5 days ago
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  
  const { data: updatedListings, error: listingsErr } = await supabase
    .from('listings')
    .update({ created_at: fiveDaysAgo.toISOString() })
    .neq('id', 0) // Dummy condition to update all
    .select('id, created_at');

  if (listingsErr) {
    console.error('Error updating listings:', listingsErr);
  } else {
    console.log(`Successfully updated ${updatedListings.length} listings to ${fiveDaysAgo.toISOString()}`);
  }

  console.log('\n--- Updating Auctions auction_date dates ---');
  
  // Auction 21 (current: 3 days ago)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const { error: err21 } = await supabase
    .from('auctions')
    .update({ auction_date: threeDaysAgo.toISOString() })
    .eq('id', 21);
  console.log('Auction 21 updated:', err21 || 'OK');

  // Auction 22 (previous: 10 days ago)
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const { error: err22 } = await supabase
    .from('auctions')
    .update({ auction_date: tenDaysAgo.toISOString() })
    .eq('id', 22);
  console.log('Auction 22 updated:', err22 || 'OK');

  // Auction 24 (previous: 11 days ago)
  const elevenDaysAgo = new Date();
  elevenDaysAgo.setDate(elevenDaysAgo.getDate() - 11);
  const { error: err24 } = await supabase
    .from('auctions')
    .update({ auction_date: elevenDaysAgo.toISOString() })
    .eq('id', 24);
  console.log('Auction 24 updated:', err24 || 'OK');

  // Auction 20 (previous: 12 days ago)
  const twelveDaysAgo = new Date();
  twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);
  const { error: err20 } = await supabase
    .from('auctions')
    .update({ auction_date: twelveDaysAgo.toISOString() })
    .eq('id', 20);
  console.log('Auction 20 updated:', err20 || 'OK');
}

run();

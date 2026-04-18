const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const listingCat = 'Gado de Leite';
    const plazaIds = [1, 2];
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: auctionData, error: auctionError } = await supabase
      .from('auction_offers')
      .select(`
        price_kg,
        auction_id,
        auctions (
          auction_date,
          plaza_id
        )
      `)
      .eq('category', listingCat)
      .in('auctions.plaza_id', plazaIds)
      .gte('auctions.auction_date', sixtyDaysAgo.toISOString());

    if (auctionError) {
        console.error('Error:', auctionError);
    } else {
        console.log(`Results found: ${auctionData?.length || 0}`);
        if (auctionData && auctionData.length > 0) {
            console.log('Sample:', JSON.stringify(auctionData[0], null, 2));
        }
    }
    
    console.log('--- Testing with !inner ---');
    const { data: auctionDataInner, error: auctionErrorInner } = await supabase
      .from('auction_offers')
      .select(`
        price_kg,
        auction_id,
        auctions!inner (
          auction_date,
          plaza_id
        )
      `)
      .eq('category', listingCat)
      .in('auctions.plaza_id', plazaIds)
      .gte('auctions.auction_date', sixtyDaysAgo.toISOString());

    if (auctionErrorInner) {
        console.error('Error Inner:', auctionErrorInner);
    } else {
        console.log(`Results found with !inner: ${auctionDataInner?.length || 0}`);
    }
}

testQuery();

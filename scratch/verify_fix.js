const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFix() {
    const listingCat = 'TERNEIRA'; // Exemplo em caixa alta que estava falhando
    const plazaIds = [1, 2];
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    console.log(`Testando busca por categoria: "${listingCat}" (deve encontrar dados em Title Case "Terneira")`);

    const { data: auctionData, error: auctionError } = await supabase
      .from('auction_offers')
      .select(`
        price_kg,
        auction_id,
        auctions!inner (
          auction_date,
          plaza_id
        )
      `)
      .ilike('category', listingCat)
      .in('auctions.plaza_id', plazaIds)
      .gte('auctions.auction_date', sixtyDaysAgo.toISOString());

    if (auctionError) {
        console.error('Error:', auctionError);
    } else {
        console.log(`Resultados encontrados: ${auctionData?.length || 0}`);
        if (auctionData && auctionData.length > 0) {
            console.log('Amostra de categoria encontrada no banco:', auctionData[0].category || 'Campo category não selecionado na query mas o filtro funcionou');
            // Verificação adicional do campo category
            const { data: sample } = await supabase.from('auction_offers').select('category').ilike('category', listingCat).limit(1);
            console.log('Categoria real no banco:', sample?.[0]?.category);
        }
    }
}

testFix();

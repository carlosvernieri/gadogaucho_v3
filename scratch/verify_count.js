const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const { count, error } = await supabase
        .from('auction_offers')
        .select('*', { count: 'exact', head: true });
        
    if (error) console.error(error);
    else console.log(`Total de ofertas no banco: ${count}`);
}
verify();

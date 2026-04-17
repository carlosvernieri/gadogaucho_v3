const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('listings')
    .select('category, price_kg, created_at');
  
  if (error) {
    console.error(error);
    return;
  }

  const counts = data.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});

  console.log('Categorias em listings:', counts);
  console.log('Total de registros:', data.length);
  
  const last7Days = data.filter(d => new Date(d.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  console.log('Registros nos últimos 7 dias:', last7Days.length);
}

checkData();

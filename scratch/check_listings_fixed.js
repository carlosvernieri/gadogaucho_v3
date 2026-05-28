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
  
  const last30Days = data.filter(d => new Date(d.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  console.log('Registros nos últimos 30 dias:', last30Days.length);
  if (last30Days.length > 0) {
    console.log('Exemplo dos últimos 30 dias:', last30Days.slice(0, 3));
  }
}

checkData();

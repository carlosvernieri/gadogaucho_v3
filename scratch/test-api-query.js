// Teste para verificar se o supabaseAdmin proxy está funcionando corretamente
// no contexto do Next.js (production build)
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
    process.env[key] = value;
  }
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const userId = '8af27169-1141-460f-8b24-d8a2956a578b';

async function run() {
  console.log('=== Testando query direta com service role key ===\n');

  // 1. Query com service role (sem RLS)
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const { data: adminData, error: adminErr } = await adminClient
    .from('saved_simulations')
    .select('id, name, calculator_type')
    .eq('user_id', userId)
    .eq('calculator_type', 'controle-peso');
  
  console.log('[service role] controle-peso count:', adminData?.length, '| error:', adminErr?.message);

  const { data: adminAll, error: adminAllErr } = await adminClient
    .from('saved_simulations')
    .select('id, name, calculator_type')
    .eq('user_id', userId);
  
  console.log('[service role] ALL types count:   ', adminAll?.length, '| error:', adminAllErr?.message);
  adminAll?.forEach(s => console.log(`  [${s.calculator_type}] ${s.name}`));
  
  // 2. Query sem filtro de user_id
  const { data: allData } = await adminClient
    .from('saved_simulations')
    .select('user_id, calculator_type, name');
  console.log('\n[service role] Total sem filtro:', allData?.length);
  allData?.forEach(s => console.log(`  user_id: ${s.user_id} | [${s.calculator_type}] ${s.name}`));

  // 3. Simular exatamente o que a API faz
  console.log('\n=== Simulando API route exatamente ===');
  const type = 'controle-peso';
  
  let query = adminClient
    .from('saved_simulations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('calculator_type', type);
  }
  
  const { data: simulations, error } = await query;
  console.log(`API simulation - count: ${simulations?.length || 0} | error: ${error?.message || 'none'}`);
}

run().catch(console.error);

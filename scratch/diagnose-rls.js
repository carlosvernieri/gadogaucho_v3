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
const clientAdmin = createClient(url, serviceKey);

async function run() {
  try {
    console.log('=== Verificando RLS da tabela saved_simulations ===\n');

    // Checar via SQL as policies
    const { data: rlsData, error: rlsError } = await clientAdmin.rpc('exec_sql', {
      sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'saved_simulations';`
    });
    
    if (rlsError) {
      console.log('rpc exec_sql não disponível:', rlsError.message);
    } else {
      console.log('Policies:', JSON.stringify(rlsData, null, 2));
    }
    
    // Tentar via sql diretamente
    const { data: tableInfo, error: tableError } = await clientAdmin
      .rpc('exec_sql', { query: `SELECT relrowsecurity FROM pg_class WHERE relname = 'saved_simulations'` });
    
    if (tableError) {
      console.log('Alternativa RPC também falhou.');
    }

    // Checar auth users
    console.log('\n=== Verificando usuários no Auth ===');
    const { data: { users }, error: usersError } = await clientAdmin.auth.admin.listUsers();
    if (usersError) {
      console.error('Erro ao listar users:', usersError.message);
    } else {
      const adriano = users.find(u => u.email === 'adriano.prog@gmail.com');
      if (adriano) {
        console.log('Usuário adriano encontrado:');
        console.log('  ID:', adriano.id);
        console.log('  Email:', adriano.email);
        console.log('  Provider:', adriano.app_metadata?.provider);
        console.log('  Providers:', adriano.app_metadata?.providers);
        console.log('  Email confirmed:', adriano.email_confirmed_at ? 'SIM' : 'NÃO');
        console.log('  Last sign in:', adriano.last_sign_in_at);
        console.log('  User metadata:', JSON.stringify(adriano.user_metadata));
      }
    }
    
    // Verificar se a API de simulations está funcionando via HTTP direto
    console.log('\n=== Teste de chamada à API sem autenticação ===');
    const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
    try {
      const resp = await fetch('http://localhost:3000/api/simulations?type=gmd');
      console.log('Status:', resp.status);
      const body = await resp.json();
      console.log('Response:', JSON.stringify(body));
    } catch(e) {
      console.log('Servidor não está rodando ou não acessível:', e.message);
    }

  } catch (err) {
    console.error('Exceção:', err);
  }
}

run();

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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    console.log('=== Diagnóstico de Autenticação ===\n');
    console.log('URL:', url);
    console.log('Anon Key (prefix):', anonKey?.substring(0, 20) + '...');
    console.log('Service Key (prefix):', serviceKey?.substring(0, 20) + '...');
    console.log('');

    // 1. Tentar login com credenciais do usuário adriano
    const clientAnon = createClient(url, anonKey);
    console.log('1. Tentando login como adriano.prog@gmail.com...');
    const { data: signInData, error: signInError } = await clientAnon.auth.signInWithPassword({
      email: 'adriano.prog@gmail.com',
      password: 'Py10587!!'
    });

    if (signInError) {
      console.error('   ERRO no login:', signInError.message);
      console.error('   Status:', signInError.status);
    } else {
      console.log('   Login OK! User ID:', signInData.user?.id);
      console.log('   Session access_token:', signInData.session?.access_token?.substring(0, 30) + '...');
      console.log('   Session expires_at:', signInData.session?.expires_at);

      // 2. Com a sessão criada, testar getUser()
      console.log('\n2. Testando getUser() após login...');
      const { data: { user }, error: userError } = await clientAnon.auth.getUser();
      if (userError) {
        console.error('   ERRO em getUser():', userError.message);
      } else {
        console.log('   getUser() OK! ID:', user?.id, 'Email:', user?.email);
      }

      // 3. Testar query de simulations com cliente anon autenticado
      console.log('\n3. Testando query de saved_simulations com cliente autenticado...');
      const { data: simData, error: simError } = await clientAnon
        .from('saved_simulations')
        .select('id, name, calculator_type')
        .order('created_at', { ascending: false });

      if (simError) {
        console.error('   ERRO na query:', simError.message, '| Code:', simError.code);
        console.log('   (Isso indica problema de RLS - sem política SELECT para usuário autenticado)');
      } else {
        console.log('   Query OK! Total:', simData.length, 'registros');
        simData.forEach(s => console.log(`   - ${s.calculator_type}: ${s.name}`));
      }
    }

    // 4. Confirmar que admin client funciona
    console.log('\n4. Testando admin client (service role) query para adriano...');
    const clientAdmin = createClient(url, serviceKey);
    const userId = '8af27169-1141-460f-8b24-d8a2956a578b';
    const { data: adminSimData, error: adminSimError } = await clientAdmin
      .from('saved_simulations')
      .select('id, name, calculator_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (adminSimError) {
      console.error('   ERRO admin query:', adminSimError.message);
    } else {
      console.log('   Admin query OK! Total:', adminSimData.length, 'registros');
    }

    // 5. Verificar se tem RLS policies na tabela
    console.log('\n5. Verificando policies RLS (via admin)...');
    const { data: policies, error: policiesError } = await clientAdmin
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'saved_simulations');

    if (policiesError) {
      console.log('   Não foi possível acessar pg_policies:', policiesError.message);
    } else {
      console.log('   Policies encontradas:', policies?.length || 0);
      policies?.forEach(p => console.log(`   - ${p.policyname}: cmd=${p.cmd}`));
    }

  } catch (err) {
    console.error('Exceção:', err);
  }
}

run();

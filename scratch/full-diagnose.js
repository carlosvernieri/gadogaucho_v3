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
const clientAdmin = createClient(url, serviceKey);
const clientAnon  = createClient(url, anonKey);

const email = 'adriano.prog@gmail.com';
const PASSWORDS_TO_TRY = ['Py150587!!', 'Py10587!!', 'Py1587!!', 'Py15587!!'];

async function run() {
  try {
    console.log('=== Diagnóstico Completo: Usuário adriano ===\n');

    // 1. Dados do usuário no Supabase Auth
    const { data: { users } } = await clientAdmin.auth.admin.listUsers();
    const adriano = users.find(u => u.email === email);
    if (!adriano) { console.error('Usuário não encontrado!'); return; }
    const userId = adriano.id;

    console.log('ID:', userId);
    console.log('Email confirmed:', adriano.email_confirmed_at ? 'SIM' : 'NÃO');
    console.log('Last sign in:', adriano.last_sign_in_at);
    console.log('');

    // 2. Testar senhas possíveis
    console.log('=== Testando senhas possíveis ===');
    let workingPassword = null;
    for (const pwd of PASSWORDS_TO_TRY) {
      const { data, error } = await clientAnon.auth.signInWithPassword({ email, password: pwd });
      if (!error) {
        console.log(`✅ Senha correta: "${pwd}"`);
        workingPassword = pwd;
        break;
      } else {
        console.log(`❌ "${pwd}" → ${error.message}`);
      }
    }

    if (!workingPassword) {
      console.log('\n⚠️  Nenhuma senha testada funcionou. Redefinindo para Py150587!!...');
      const newPassword = 'Py150587!!';
      const { error } = await clientAdmin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) {
        console.error('Erro ao redefinir:', error.message);
      } else {
        const { data, error: loginErr } = await clientAnon.auth.signInWithPassword({ email, password: newPassword });
        if (loginErr) {
          console.error('Ainda falha após redefinição:', loginErr.message);
        } else {
          console.log(`✅ Senha redefinida e confirmada: "${newPassword}"`);
          workingPassword = newPassword;
        }
      }
    }

    console.log('');

    // 3. Dados no banco (via admin para garantir)
    console.log('=== Dados no banco (admin query) ===');
    const { data: sims, error: simsErr } = await clientAdmin
      .from('saved_simulations')
      .select('id, name, calculator_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (simsErr) {
      console.error('Erro ao buscar simulations:', simsErr.message);
    } else {
      console.log(`Total de simulações: ${sims.length}`);
      sims.forEach(s => console.log(`  [${s.calculator_type}] ${s.name}`));
    }

    console.log('');

    // 4. Testar query com cliente autenticado (simula o que o browser faz)
    if (workingPassword) {
      console.log('=== Teste de query como usuário autenticado ===');
      const clientAuth = createClient(url, anonKey);
      const { error: signInErr } = await clientAuth.auth.signInWithPassword({ email, password: workingPassword });
      if (signInErr) {
        console.error('Falha no login para teste:', signInErr.message);
      } else {
        for (const type of ['controle-peso', 'gmd', 'pastagem', 'proteinado']) {
          const { data, error } = await clientAuth
            .from('saved_simulations')
            .select('id, name')
            .eq('user_id', userId)
            .eq('calculator_type', type);
          if (error) {
            console.log(`  [${type}]: ERRO → ${error.message} (code: ${error.code})`);
          } else {
            console.log(`  [${type}]: ${data.length} registro(s) encontrado(s) ← RLS OK`);
          }
        }
      }
    }

    // 5. Testar via HTTP o servidor rodando
    console.log('\n=== Testando servidor HTTP ===');
    try {
      const http = await import('node-fetch').catch(() => null);
      if (http) {
        const resp = await http.default('http://localhost:3000/api/simulations?type=gmd');
        const body = await resp.json();
        console.log(`GET /api/simulations?type=gmd → Status: ${resp.status}`);
        if (resp.status === 401) console.log('  → 401: Sessão não reconhecida pelo servidor');
        else console.log('  → Dados:', JSON.stringify(body).substring(0, 200));
      } else {
        console.log('node-fetch não disponível, pulando teste HTTP');
      }
    } catch (e) {
      console.log('Servidor não acessível em localhost:3000 OU node-fetch ausente:', e.message);
    }

  } catch (err) {
    console.error('Exceção:', err.message);
  }
}

run();

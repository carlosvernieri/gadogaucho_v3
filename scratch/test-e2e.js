// Simula exatamente o que o browser faz: login via /api/auth/login,
// recebe cookies, depois chama /api/simulations com esses cookies
const fs = require('fs');
const path = require('path');

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

const BASE = 'http://localhost:3000';

async function run() {
  const fetch = (await import('node-fetch')).default;

  console.log('=== Teste End-to-End: Login → API Simulations ===\n');

  // 1. Fazer login via API
  console.log('1. POST /api/auth/login...');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'adriano.prog@gmail.com', password: 'Py150587!!' })
  });

  console.log('   Status:', loginRes.status);
  const loginBody = await loginRes.json();

  if (loginRes.status !== 200) {
    console.error('   ERRO no login:', loginBody);
    return;
  }

  console.log('   User:', loginBody.id, loginBody.email);
  console.log('   _session token present:', !!loginBody._session?.access_token);

  // 2. Extrair cookies da resposta
  const rawCookies = loginRes.headers.raw()['set-cookie'] || [];
  console.log(`\n   Cookies recebidos (${rawCookies.length}):`);
  rawCookies.forEach(c => console.log('   ', c.split(';')[0].substring(0, 80)));

  const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');

  if (!cookieHeader) {
    console.error('\n❌ NENHUM COOKIE foi definido pelo servidor!');
    console.log('   Isso explica o 401 — sem cookie, o servidor não reconhece a sessão.');
    return;
  }

  // 3. Chamar /api/simulations com os cookies
  console.log('\n2. GET /api/simulations?type=controle-peso (com cookies)...');
  const simsRes = await fetch(`${BASE}/api/simulations?type=controle-peso`, {
    headers: { 'Cookie': cookieHeader }
  });
  console.log('   Status:', simsRes.status);
  const simsBody = await simsRes.json();
  if (simsRes.status === 200) {
    console.log('   ✅ Count:', simsBody.length);
    simsBody.forEach(s => console.log(`     [${s.calculator_type}] ${s.name}`));
  } else {
    console.log('   ❌ Error:', JSON.stringify(simsBody));
  }

  // 4. Testar todas as calculadoras
  console.log('\n3. Testando todos os tipos...');
  for (const type of ['gmd', 'pastagem', 'proteinado', 'controle-peso']) {
    const res = await fetch(`${BASE}/api/simulations?type=${type}`, {
      headers: { 'Cookie': cookieHeader }
    });
    const body = await res.json();
    if (res.status === 200) {
      console.log(`   [${type}]: ✅ ${body.length} registro(s)`);
    } else {
      console.log(`   [${type}]: ❌ Status ${res.status} — ${JSON.stringify(body)}`);
    }
  }
}

run().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let supabaseUrl = '';
let supabaseAnonKey = '';
let supabaseServiceKey = '';

try {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = value;
      } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
        supabaseAnonKey = value;
      } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
        supabaseServiceKey = value;
      }
    }
  }
} catch (e) {
  console.error('Failed to load env:', e);
}

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase configurations in .env.local');
  process.exit(1);
}

// 1. Client representing a public (anonymous) visitor
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// 2. Client representing Admin/System
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log('=== TESTE DE ROW LEVEL SECURITY (RLS) ===\n');

  // Test 1: Public read on listings (Only unsold or null sold listings)
  console.log('1. Testando leitura anônima de anúncios...');
  const { data: anonListings, error: anonListingsError } = await supabaseAnon
    .from('listings')
    .select('id, title, sold')
    .limit(5);

  if (anonListingsError) {
    console.error('   ❌ Falha ao buscar anúncios de forma anônima:', anonListingsError.message);
  } else {
    console.log(`   ✅ Sucesso! Encontrados ${anonListings?.length} anúncios.`);
    const soldFound = anonListings?.filter(l => l.sold);
    if (soldFound && soldFound.length > 0) {
      console.error('   ❌ Erro de RLS: Encontrou anúncios vendidos em consulta anônima!', soldFound);
    } else {
      console.log('   ✅ Nenhum anúncio vendido retornado para usuário anônimo (Correto).');
    }
  }

  // Test 2: Public read on users profile
  console.log('\n2. Testando leitura anônima de perfis de usuários...');
  const { data: anonUsers, error: anonUsersError } = await supabaseAnon
    .from('users')
    .select('id, name')
    .limit(5);

  if (anonUsersError) {
    console.error('   ❌ Falha ao buscar perfis de forma anônima:', anonUsersError.message);
  } else {
    console.log(`   ✅ Sucesso! Encontrados ${anonUsers?.length} perfis de usuários públicos.`);
  }

  // Test 3: Public read on messages (Should be blocked by RLS since no user context)
  console.log('\n3. Testando leitura anônima de mensagens (Deve retornar vazio devido ao RLS)...');
  const { data: anonMessages, error: anonMessagesError } = await supabaseAnon
    .from('messages')
    .select('id, message')
    .limit(5);

  if (anonMessagesError) {
    // Note: Supabase RLS select policies usually result in empty data (0 rows), not an error, unless permissions are denied.
    console.log('   ℹ️ Chamada retornou erro (ou bloqueio):', anonMessagesError.message);
  } else {
    if (anonMessages && anonMessages.length > 0) {
      console.error('   ❌ Falha! Usuário anônimo conseguiu ler mensagens privadas:', anonMessages);
    } else {
      console.log('   ✅ Sucesso! Nenhuma mensagem privada foi exposta ao usuário anônimo.');
    }
  }

  // Test 4: Public read on favorites (Should be empty due to RLS)
  console.log('\n4. Testando leitura anônima de favoritos (Deve retornar vazio)...');
  const { data: anonFavorites, error: anonFavoritesError } = await supabaseAnon
    .from('favorites')
    .select('*')
    .limit(5);

  if (anonFavoritesError) {
    console.log('   ℹ️ Chamada retornou erro (ou bloqueio):', anonFavoritesError.message);
  } else {
    if (anonFavorites && anonFavorites.length > 0) {
      console.error('   ❌ Falha! Usuário anônimo conseguiu ler favoritos:', anonFavorites);
    } else {
      console.log('   ✅ Sucesso! Nenhum favorito exposto ao usuário anônimo.');
    }
  }

  // Test 5: Admin bypass checks (Admin client should read everything)
  console.log('\n5. Testando Admin client (Bypass RLS)...');
  const { data: adminListings, error: adminListingsError } = await supabaseAdmin
    .from('listings')
    .select('id, title, sold')
    .limit(5);

  if (adminListingsError) {
    console.error('   ❌ Falha do Admin ao buscar anúncios:', adminListingsError.message);
  } else {
    console.log(`   ✅ Sucesso! Admin conseguiu ler ${adminListings?.length} anúncios (incluindo vendidos se houver).`);
  }
}

runTests();

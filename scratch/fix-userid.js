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

const email = 'adriano.prog@gmail.com';

async function run() {
  console.log('=== Comparando IDs: Supabase Auth vs saved_simulations ===\n');

  // 1. ID do usuário no Supabase Auth
  const { data: { users } } = await clientAdmin.auth.admin.listUsers();
  const adriano = users.find(u => u.email === email);
  const authId = adriano.id;
  console.log('ID no Supabase AUTH:         ', authId);

  // 2. ID do usuário na tabela public.users
  const { data: publicUser } = await clientAdmin
    .from('users')
    .select('id, email, name')
    .eq('email', email)
    .maybeSingle();
  console.log('ID na tabela public.users:   ', publicUser?.id);
  console.log('Match Auth == public.users:  ', authId === publicUser?.id ? '✅ SIM' : '❌ NÃO — IDs DIFERENTES!');

  // 3. Quais user_ids existem em saved_simulations para adriano's email?
  console.log('\n=== Simulações por user_id ===');
  const { data: allSims } = await clientAdmin
    .from('saved_simulations')
    .select('user_id, name, calculator_type');

  // Agrupar por user_id
  const byUser = {};
  allSims.forEach(s => {
    byUser[s.user_id] = byUser[s.user_id] || [];
    byUser[s.user_id].push(`[${s.calculator_type}] ${s.name}`);
  });

  console.log('user_id Auth (query usa este):', authId);
  console.log('Simulações neste user_id:', byUser[authId]?.length || 0);
  if (byUser[authId]) byUser[authId].forEach(s => console.log('  ', s));

  if (publicUser?.id && publicUser.id !== authId) {
    console.log('\nuser_id public.users (id legado):', publicUser.id);
    console.log('Simulações neste user_id:', byUser[publicUser.id]?.length || 0);
    if (byUser[publicUser.id]) byUser[publicUser.id].forEach(s => console.log('  ', s));
  }

  // 4. Mostrar TODOS os user_ids com simulações
  console.log('\n=== Todos os user_ids com simulações ===');
  Object.keys(byUser).forEach(uid => {
    const flag = uid === authId ? ' ← AUTH ID (usado pela API)' : uid === publicUser?.id ? ' ← PUBLIC.USERS ID' : '';
    console.log(`user_id: ${uid}${flag}`);
    byUser[uid].forEach(s => console.log(`  ${s}`));
  });

  // 5. Se IDs são diferentes, corrigir
  if (publicUser?.id && publicUser.id !== authId) {
    console.log('\n=== ⚠️  PROBLEMA ENCONTRADO: user_id desincronizado! ===');
    console.log('As simulações estão salvas com o ID antigo (public.users).');
    console.log('A API busca pelo ID do Auth. Por isso retorna 0 resultados.');
    console.log('\nCorrigindo: atualizando user_id das simulações para o ID do Auth...');
    
    const { data: updated, error: updateErr } = await clientAdmin
      .from('saved_simulations')
      .update({ user_id: authId })
      .eq('user_id', publicUser.id)
      .select('id, name, calculator_type');
    
    if (updateErr) {
      console.error('Erro ao atualizar:', updateErr.message);
    } else {
      console.log(`✅ ${updated.length} simulações atualizadas!`);
      updated.forEach(s => console.log(`  [${s.calculator_type}] ${s.name}`));
    }

    // Também corrigir public.users.id se necessário
    console.log('\nVerificando tabela public.users...');
    const { error: userUpdateErr } = await clientAdmin
      .from('users')
      .update({ id: authId })
      .eq('email', email);
    
    if (userUpdateErr) {
      console.log('Aviso ao atualizar public.users.id:', userUpdateErr.message);
      console.log('(Pode ser PK constraint — a tabela users talvez já tenha o ID correto ou use trigger)');
    } else {
      console.log('✅ public.users.id atualizado para o ID do Auth.');
    }
  } else {
    console.log('\n✅ IDs estão sincronizados. O problema é outro (ver acima).');
  }
}

run().catch(console.error);

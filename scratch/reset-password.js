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
const clientAnon = createClient(url, anonKey);

const email = 'adriano.prog@gmail.com';
const desiredPassword = 'Py10587!!';

async function run() {
  try {
    // 1. Verificar estado atual
    console.log('=== Verificando e redefinindo senha do usuário adriano ===\n');
    
    const { data: { users } } = await clientAdmin.auth.admin.listUsers();
    const adriano = users.find(u => u.email === email);
    console.log('ID:', adriano.id);
    console.log('Last sign in:', adriano.last_sign_in_at);
    
    // 2. Testar senha atual
    console.log('\n1. Testando senha atual...');
    const { data: loginData, error: loginError } = await clientAnon.auth.signInWithPassword({
      email,
      password: desiredPassword
    });
    
    if (!loginError) {
      console.log('✅ Senha já está correta: Py10587!!');
      console.log('   User ID confirmado:', loginData.user?.id);
      return;
    }
    
    console.log('❌ Senha atual NÃO é Py10587!! :', loginError.message);
    
    // 3. Redefinir para a senha desejada
    console.log('\n2. Redefinindo senha para: Py10587!!');
    const { error: updateError } = await clientAdmin.auth.admin.updateUserById(adriano.id, {
      password: desiredPassword
    });
    
    if (updateError) {
      console.error('❌ Erro ao redefinir senha:', updateError.message);
      return;
    }
    console.log('✅ Senha redefinida!');
    
    // 4. Confirmar com login
    console.log('\n3. Confirmando login com nova senha...');
    const { data: confirmData, error: confirmError } = await clientAnon.auth.signInWithPassword({
      email,
      password: desiredPassword
    });
    
    if (confirmError) {
      console.error('❌ Login ainda falhou:', confirmError.message);
    } else {
      console.log('✅ Login confirmado! Senha correta: Py10587!!');
      console.log('   User ID:', confirmData.user?.id);
    }
    
  } catch (err) {
    console.error('Exceção:', err);
  }
}

run();

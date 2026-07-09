const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create non-admin client (anon key)
const supabase = createClient(supabaseUrl, anonKey);

async function testUserAuthPut() {
  console.log('Logging in as admin@admin.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  const user = authData.user;
  console.log('Login successful! Logged in User ID:', user.id);

  const allowedUpdates = {
    name: 'Administrador Gado Gaúcho',
    phone: '(51) 9819 26800',
    city: 'Mariana Pimentel',
    email: 'admin@admin.com'
  };

  console.log(`Running update on public.users for ID: ${user.id} using authenticated client...`);
  const { data, error } = await supabase
    .from('users')
    .update(allowedUpdates)
    .eq('id', user.id)
    .select('id, name, email, phone, city, is_admin, verified')
    .single();

  if (error) {
    console.error('API UPDATE QUERY ERROR (RLS/Auth):', error);
  } else {
    console.log('API Update query success! Returned data:', data);
  }
}

testUserAuthPut().catch(console.error);

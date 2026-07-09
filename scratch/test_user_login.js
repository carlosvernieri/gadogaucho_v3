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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, anonKey);
const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);

async function testUserLogin() {
  const email = 'adriano.prog@gmail.com';
  const password = 'Py150587!!';

  console.log(`Trying native login for ${email}...`);
  const loginRes = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginRes.error) {
    console.log('Native login failed:', loginRes.error.message);
  } else {
    console.log('Native login succeeded! User data:', loginRes.data.user);
    return;
  }

  // If native failed, check what is in public.users
  console.log('Checking user row in public.users...');
  const { data: publicUser, error: pubError } = await supabaseAdminClient
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (pubError) {
    console.error('Error fetching public user:', pubError);
  } else if (!publicUser) {
    console.log('User row in public.users DOES NOT EXIST.');
  } else {
    console.log('User row in public.users exists:', publicUser);
  }

  // Check auth.users via admin API
  console.log('Checking auth.users via admin listUsers...');
  const { data: { users }, error: listError } = await supabaseAdminClient.auth.admin.listUsers();
  const authUser = users.find(u => u.email === email);
  if (authUser) {
    console.log('User exists in auth.users:', authUser.id, authUser.email, 'Metadata:', authUser.user_metadata);
  } else {
    console.log('User DOES NOT exist in auth.users.');
  }
}

testUserLogin().catch(console.error);

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

const supabase = createClient(supabaseUrl, anonKey);

async function testAdminLogin() {
  const email = 'admin@admin.com';
  const password = 'admin123';

  console.log(`Trying native login for ${email} with password ${password}...`);
  const loginRes = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginRes.error) {
    console.log('Login failed:', loginRes.error.message);
  } else {
    console.log('Login SUCCEEDED! User data:', loginRes.data.user);
  }
}

testAdminLogin().catch(console.error);

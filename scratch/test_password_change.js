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

async function testPasswordChange() {
  console.log('1. Setting initial password in auth to "admin123" for testing...');
  const { data: { users } } = await supabaseAdminClient.auth.admin.listUsers();
  const adminUser = users.find(u => u.email === 'admin@admin.com');
  if (!adminUser) {
    console.error('Admin user not found in auth.users');
    return;
  }

  // Set the password in auth.users to 'admin123'
  await supabaseAdminClient.auth.admin.updateUserById(adminUser.id, {
    password: 'admin123'
  });

  // Try to log in with 'admin123'
  let loginRes = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin123'
  });

  if (loginRes.error) {
    console.error('Initial login with admin123 failed:', loginRes.error.message);
    return;
  }

  console.log('Login successful! Session user email:', loginRes.data.user.email);

  // 2. Change password to 'admin_new_pass' using the client instance (like the web app does)
  console.log('2. Updating password to "admin_new_pass" using auth.updateUser...');
  
  const { data: { session } } = loginRes;
  const clientSupabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  await clientSupabase.auth.setSession(session);
  
  const { data: updateData, error: updateError } = await clientSupabase.auth.updateUser({
    password: 'admin_new_pass'
  });

  if (updateError) {
    console.error('Password update failed:', updateError.message);
    return;
  }
  console.log('Password update successful!');

  // 3. Log out
  console.log('3. Logging out...');

  // 4. Try logging in with the old password 'admin123'
  console.log('4. Trying login with OLD password "admin123"...');
  const oldLoginRes = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin123'
  });
  console.log('Old password login result:', oldLoginRes.error ? `Failed: ${oldLoginRes.error.message}` : 'Succeeded (Unexpected!)');

  // 5. Try logging in with the NEW password 'admin_new_pass'
  console.log('5. Trying login with NEW password "admin_new_pass"...');
  const newLoginRes = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin_new_pass'
  });
  console.log('New password login result:', newLoginRes.error ? `Failed: ${newLoginRes.error.message}` : 'Succeeded!');

  // 6. Reset password back to 'admin123'
  console.log('6. Reverting password back to "admin123" for safety...');
  await supabaseAdminClient.auth.admin.updateUserById(adminUser.id, {
    password: 'admin123'
  });
  
  // Also update public.users password column back to 'admin123'
  await supabaseAdminClient.from('users').update({ password: 'admin123' }).eq('id', adminUser.id);
  console.log('Revert complete.');
}

testPasswordChange().catch(console.error);

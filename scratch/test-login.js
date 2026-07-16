// Test to check if the new sb_publishable_ anon key works with signInWithPassword
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
  // Try to reset the password for adriano using admin and then test login
  const clientAdmin = createClient(url, serviceKey);
  const email = 'adriano.prog@gmail.com';
  
  // Get the user ID
  const { data: { users }, error: listError } = await clientAdmin.auth.admin.listUsers();
  if (listError) { console.error('list error:', listError); return; }
  
  const adriano = users.find(u => u.email === email);
  if (!adriano) { console.error('Adriano not found'); return; }
  
  console.log('Found adriano:', adriano.id);
  console.log('Provider:', adriano.app_metadata?.provider);
  console.log('Email confirmed:', adriano.email_confirmed_at ? 'YES' : 'NO');
  console.log('');
  
  // Try a password with special chars using Buffer to check encoding
  const password = 'Py10587!!';
  console.log('Password bytes:', Buffer.from(password).toString('hex'));
  console.log('Password length:', password.length);
  console.log('');
  
  // Try the anon client with this password
  const clientAnon = createClient(url, anonKey);
  console.log('Testing login with anon key (prefix:', anonKey?.substring(0, 20) + ')...');
  
  const { data, error } = await clientAnon.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Login FAILED:', error.message, '| Status:', error.status);
    console.log('');
    console.log('Trying to update password via admin and test again...');
    
    // Update user password via admin API
    const testPassword = 'TestPass123!';
    const { data: updData, error: updError } = await clientAdmin.auth.admin.updateUserById(adriano.id, {
      password: testPassword
    });
    if (updError) {
      console.error('Failed to update password:', updError.message);
    } else {
      console.log('Password updated to test password. Trying login...');
      const { data: loginData, error: loginError } = await clientAnon.auth.signInWithPassword({
        email,
        password: testPassword
      });
      if (loginError) {
        console.error('Login still FAILED:', loginError.message);
        console.log('This suggests the anon key format is incompatible with signInWithPassword');
      } else {
        console.log('Login SUCCESS with test password!');
        console.log('User ID:', loginData.user?.id);
        console.log('The issue was the PASSWORD, not the key format.');
        
        // Reset back to original password
        const { error: resetError } = await clientAdmin.auth.admin.updateUserById(adriano.id, {
          password: password
        });
        if (resetError) {
          console.error('Failed to reset password back to original:', resetError.message);
          console.log('WARNING: Password is currently set to', testPassword);
        } else {
          console.log('Password reset back to original.');
          // Test with original password
          const { data: finalData, error: finalError } = await clientAnon.auth.signInWithPassword({
            email,
            password
          });
          if (finalError) {
            console.error('Original password still fails:', finalError.message);
            console.log('This suggests the Supabase Auth password is different from what we expect.');
          } else {
            console.log('Original password works! Login fully confirmed.');
          }
        }
      }
    }
  } else {
    console.log('Login SUCCESS!');
    console.log('User ID:', data.user?.id);
    console.log('Access token prefix:', data.session?.access_token?.substring(0, 30) + '...');
  }
}

run().catch(console.error);

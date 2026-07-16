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
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    process.env[key] = value;
  }
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const email = 'adriano.prog@gmail.com';
    const password = 'Password123!'; // We don't have the password, but we can sign in using service role to get a user session token or just use admin client.
    // Wait, with service role key we can generate a session or we can query directly.
    // Let's see what happens if we query with the anon client without signing in:
    const clientAnon = createClient(url, anonKey);
    const { data: anonData, error: anonError } = await clientAnon
      .from('saved_simulations')
      .select('*');
    
    console.log('--- ANON CLIENT QUERY (no auth) ---');
    console.log('Error:', anonError);
    console.log('Count:', anonData ? anonData.length : null);

    // Let's create an admin client to get the user's token or run as that user:
    const clientAdmin = createClient(url, serviceKey);
    
    // We can use the admin client's auth.admin api to generate a magic link or just query.
    // But wait! Can we sign in with the user's email using admin client?
    // Let's try to fetch user's id.
    const { data: { users }, error: usersError } = await clientAdmin.auth.admin.listUsers();
    const userObj = users.find(u => u.email === email);
    
    if (userObj) {
      console.log(`\nFound user ${userObj.email} with ID ${userObj.id}`);
      
      // Let's query using the admin client (which bypasses RLS):
      const { data: adminData, error: adminError } = await clientAdmin
        .from('saved_simulations')
        .select('*')
        .eq('user_id', userObj.id);
      
      console.log('--- ADMIN CLIENT QUERY ---');
      console.log('Error:', adminError);
      console.log('Count:', adminData ? adminData.length : null);
      if (adminData) {
        adminData.forEach(s => console.log(`- Type: ${s.calculator_type}, Name: ${s.name}`));
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();

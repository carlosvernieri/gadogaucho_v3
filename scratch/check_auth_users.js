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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAuthUsers() {
  console.log('Listing users from auth.users...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing auth users:', error);
  } else {
    console.log('Auth users count:', users.length);
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, CreatedAt: ${user.created_at}, Metadata:`, user.user_metadata);
    });
  }
}

checkAuthUsers().catch(console.error);

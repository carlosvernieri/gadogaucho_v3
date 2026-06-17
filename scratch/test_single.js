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

async function testSingle() {
  const id = '8af27169-1141-460f-8b24-d8a2956a578b';
  
  const allowedUpdates = {
    name: 'Administrador Teste 2',
    phone: '(51) 9819 26800',
    city: 'Mariana Pimentel',
    email: 'admin@admin.com'
  };
  
  console.log(`Running exact API PUT query for ID: ${id}`);
  
  const { data, error } = await supabase
    .from('users')
    .update(allowedUpdates)
    .eq('id', id)
    .select('id, name, email, phone, city, is_admin, verified')
    .single();
    
  if (error) {
    console.error('API UPDATE QUERY ERROR:', error);
  } else {
    console.log('API Update query success! Returned data:', data);
  }
}

testSingle().catch(console.error);

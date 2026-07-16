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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  try {
    const userId = '8af27169-1141-460f-8b24-d8a2956a578b';
    const type = 'controle-peso';
    
    console.log(`Querying saved_simulations for user_id=${userId} and calculator_type=${type}...`);
    
    const { data, error } = await supabase
      .from('saved_simulations')
      .select('*')
      .eq('user_id', userId)
      .eq('calculator_type', type)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log(`Found ${data.length} simulations:`);
      data.forEach(s => {
        console.log(`- ID: ${s.id}, Name: ${s.name}, Created: ${s.created_at}`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

run();

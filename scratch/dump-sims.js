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
    const { data: sims, error } = await supabase
      .from('saved_simulations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      console.log(`Total simulations: ${sims.length}`);
      sims.forEach(s => {
        console.log(`- ID: ${s.id}\n  User: ${s.user_id}\n  Name: ${s.name}\n  Type: ${s.calculator_type}\n  Inputs: ${JSON.stringify(s.inputs)}`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

run();

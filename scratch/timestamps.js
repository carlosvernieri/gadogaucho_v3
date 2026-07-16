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
    const { data: sims } = await supabase
      .from('saved_simulations')
      .select('id, name, calculator_type, created_at')
      .order('created_at', { ascending: false });

    const { data: logs } = await supabase
      .from('system_logs')
      .select('created_at, level, context, message, details')
      .order('created_at', { ascending: false })
      .limit(30);

    console.log('--- SAVED SIMULATIONS ---');
    sims.forEach(s => {
      console.log(`[${s.created_at}] SIM: ID=${s.id} TYPE=${s.calculator_type} NAME="${s.name}"`);
    });

    console.log('\n--- SYSTEM LOGS ---');
    logs.forEach(l => {
      console.log(`[${l.created_at}] LOG: [${l.context}] ${l.message} (details=${JSON.stringify(l.details)})`);
    });
  } catch (err) {
    console.error(err);
  }
}

run();

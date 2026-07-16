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
    const { data: logs, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
    } else {
      console.log(`Retrieved ${logs.length} logs:`);
      logs.forEach(l => {
        console.log(`[${l.level.toUpperCase()}] [${l.context}] ${l.message}`);
        if (l.details) {
          console.log(`  Details: ${JSON.stringify(l.details)}`);
        }
      });
    }
  } catch (err) {
    console.error(err);
  }
}

run();

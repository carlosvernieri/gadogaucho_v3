const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envVars = {};
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const firstEqual = trimmed.indexOf('=');
      if (firstEqual === -1) return;
      const key = trimmed.substring(0, firstEqual).trim();
      let val = trimmed.substring(firstEqual + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      envVars[key] = val;
    });
  }
} catch (e) {}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function main() {
  const { data, error } = await supabase.from('listings').select('id, image, images, videos').limit(5);
  if (error) {
    console.error(error);
    return;
  }
  console.log('Listings sample:', JSON.stringify(data, null, 2));
}
main();

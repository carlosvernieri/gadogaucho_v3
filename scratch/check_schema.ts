import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let supabaseUrl = '';
let supabaseKey = '';

try {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = value;
      } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
        supabaseKey = value;
      }
    }
  }
} catch (e) {
  console.error('Failed to load env:', e);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase config:', { supabaseUrl, supabaseKey });
  process.exit(1);
}

async function fetchSwagger() {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const swagger = await res.json();
    
    console.log("=== Listings Table Properties ===");
    const listingsProps = swagger.definitions.listings?.properties;
    if (listingsProps) {
      for (const [propName, propVal] of Object.entries(listingsProps)) {
        console.log(` - ${propName}: type=${(propVal as any).type}, format=${(propVal as any).format || 'none'}`);
      }
    } else {
      console.log("Listings definition not found in swagger");
    }

    console.log("\n=== Users Table Properties ===");
    const usersProps = swagger.definitions.users?.properties;
    if (usersProps) {
      for (const [propName, propVal] of Object.entries(usersProps)) {
        console.log(` - ${propName}: type=${(propVal as any).type}, format=${(propVal as any).format || 'none'}`);
      }
    } else {
      console.log("Users definition not found in swagger");
    }
}

fetchSwagger();


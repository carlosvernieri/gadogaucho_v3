import { supabaseAdmin } from './lib/supabase';

async function checkSchema() {
  const { data, error } = await (supabaseAdmin.from('listings') as any).select('*').limit(1);
  if (error) {
    console.error('Error checking schema:', error);
  } else {
    console.log('Columns in listings:', Object.keys(data[0] || {}));
  }
}

checkSchema();

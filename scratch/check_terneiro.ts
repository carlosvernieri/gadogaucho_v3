
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, category, price_kg, created_at')
    .ilike('category', 'terneiro');

  if (error) {
    console.error(error);
    return;
  }

  console.log('Terneiro listings:', data);
}

check();

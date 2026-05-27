const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
const supabaseKey = 'sb_publishable_CIyCPKjw1fCKMOuXQBtMJw_w_obxEE8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
    if (error && error.message.includes('FetchError')) {
      console.log('Network Error or Invalid URL');
    } else if (error && error.code === 'PGRST301') {
       console.log('JWT expired or invalid');
    } else {
      console.log('Response Error:', error);
      console.log('Response Data:', data);
    }
  } catch (err) {
    console.error('Execution Error:', err);
  }
}

test();

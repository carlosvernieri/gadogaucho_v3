const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbXhna3B5bHVtenl2am1yYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI2MzAwMSwiZXhwIjoyMDg5ODM5MDAxfQ.kOWH_VERJv2exFB7jih1ED-hFnHddHQDHexGJKUXXhw';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const userId = '8af27169-1141-460f-8b24-d8a2956a578b';
  const listingId = 80;

  console.log('Testing INSERT/UPSERT of favorite...');
  const { data: insertData, error: insertError } = await supabaseAdmin
    .from('favorites')
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' });

  if (insertError) {
    console.error('❌ Insert Error:', insertError);
  } else {
    console.log('✅ Insert Success! Result data:', insertData);
  }

  console.log('Testing SELECT of favorites...');
  const { data: selectData, error: selectError } = await supabaseAdmin
    .from('favorites')
    .select('*')
    .eq('user_id', userId);

  if (selectError) {
    console.error('❌ Select Error:', selectError);
  } else {
    console.log('✅ Select Success! Result data:', selectData);
  }
}

test();

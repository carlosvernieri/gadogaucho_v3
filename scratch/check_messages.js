const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Find admin user
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'admin@admin.com')
    .single();

  if (userErr) {
    console.error('Error finding admin user:', userErr);
    process.exit(1);
  }

  const adminId = users.id;
  console.log('Admin ID:', adminId);

  // Find admin's listings
  const { data: listings, error: listingsErr } = await supabase
    .from('listings')
    .select('id, title')
    .eq('user_id', adminId);

  if (listingsErr) {
    console.error('Error finding listings:', listingsErr);
    process.exit(1);
  }

  console.log('Admin listings:', listings);

  if (listings.length === 0) {
    console.log('No listings for admin user. Cannot test message badge easily without a listing.');
    process.exit(0);
  }

  // Count unread messages for admin's listings
  const listingIds = listings.map(l => l.id);
  const { data: messages, error: messagesErr } = await supabase
    .from('messages')
    .select('id, is_read')
    .in('listing_id', listingIds);

  if (messagesErr) {
    console.error('Error counting messages:', messagesErr);
    process.exit(1);
  }

  const unread = messages.filter(m => !m.is_read);
  console.log(`Total messages: ${messages.length}, Unread: ${unread.length}`);

  // If no unread, let's insert one!
  if (unread.length === 0) {
    console.log('No unread messages found. Inserting one test message...');
    const { data: inserted, error: insertErr } = await supabase
      .from('messages')
      .insert({
        listing_id: listingIds[0],
        sender_name: 'Testador do Badge',
        sender_email: 'test@badge.com',
        sender_phone: '(51) 99999-9999',
        message: 'Gostei muito deste lote! Ainda está disponível?',
        is_read: false
      })
      .select();

    if (insertErr) {
      console.error('Error inserting message:', insertErr);
    } else {
      console.log('Successfully inserted unread message:', inserted);
    }
  } else {
    console.log('Existing unread message(s) found. Badge will display count:', unread.length);
  }
}

run();

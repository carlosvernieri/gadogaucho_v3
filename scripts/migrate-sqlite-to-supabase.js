const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Configuration
const DB_PATH = path.join(process.cwd(), 'gado_gaucho.db');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase credentials missing');
  process.exit(1);
}

const db = new Database(DB_PATH);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log('Starting migration...');

  // 1. Migrate Users
  const users = db.prepare('SELECT * FROM users').all();
  console.log(`Found ${users.length} users in SQLite`);
  for (const user of users) {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      password: user.password,
      is_admin: !!user.is_admin
    }, { onConflict: 'email' });
    if (error) console.error(`Error migrating user ${user.email}:`, error.message);
  }

  // 2. Migrate Listings
  const listings = db.prepare('SELECT * FROM listings').all();
  console.log(`Found ${listings.length} listings in SQLite`);
  for (const listing of listings) {
    const { error } = await supabase.from('listings').upsert({
      id: listing.id,
      category: listing.category,
      title: listing.title,
      price: listing.price,
      price_kg: listing.priceKg,
      avg_weight: listing.avgWeight,
      quantity: listing.quantity,
      location: listing.location,
      lat: listing.lat,
      lng: listing.lng,
      seller: listing.seller,
      user_id: listing.userId,
      seller_rating: listing.sellerRating,
      verified: !!listing.verified,
      sold: !!listing.sold,
      verification_requested: !!listing.verification_requested,
      image: listing.image,
      description: listing.description,
      images: JSON.parse(listing.images || '[]'),
      videos: JSON.parse(listing.videos || '[]')
    });
    if (error) console.error(`Error migrating listing ${listing.id}:`, error.message);
  }

  // 3. Migrate Favorites
  const favorites = db.prepare('SELECT * FROM favorites').all();
  console.log(`Found ${favorites.length} favorites in SQLite`);
  for (const favorite of favorites) {
    const { error } = await supabase.from('favorites').upsert({
      id: favorite.id,
      user_email: favorite.user_email,
      listing_id: favorite.listing_id
    }, { onConflict: 'user_email, listing_id' });
    if (error) console.error(`Error migrating favorite ${favorite.id}:`, error.message);
  }

  // 4. Migrate Messages
  const messages = db.prepare('SELECT * FROM messages').all();
  console.log(`Found ${messages.length} messages in SQLite`);
  for (const message of messages) {
    const { error } = await supabase.from('messages').upsert({
      id: message.id,
      listing_id: message.listing_id,
      sender_name: message.sender_name,
      sender_email: message.sender_email,
      sender_phone: message.sender_phone,
      message: message.message,
      is_read: !!message.is_read
    });
    if (error) console.error(`Error migrating message ${message.id}:`, error.message);
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);

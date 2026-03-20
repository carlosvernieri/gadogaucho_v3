import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import db from '@/lib/db';

export async function GET() {
  try {
    console.log('Starting migration via API...');

    // 1. Migrate Users
    const users = db.prepare('SELECT * FROM users').all() as any[];
    console.log(`Found ${users.length} users in SQLite`);
    for (const user of users) {
      const { error } = await (supabaseAdmin.from('users') as any).upsert({
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
    const listings = db.prepare('SELECT * FROM listings').all() as any[];
    console.log(`Found ${listings.length} listings in SQLite`);
    for (const listing of listings) {
      const { error } = await (supabaseAdmin.from('listings') as any).upsert({
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
    const favorites = db.prepare('SELECT * FROM favorites').all() as any[];
    console.log(`Found ${favorites.length} favorites in SQLite`);
    for (const favorite of favorites) {
      const { error } = await (supabaseAdmin.from('favorites') as any).upsert({
        id: favorite.id,
        user_email: favorite.user_email,
        listing_id: favorite.listing_id
      }, { onConflict: 'user_email, listing_id' });
      if (error) console.error(`Error migrating favorite ${favorite.id}:`, error.message);
    }

    // 4. Migrate Messages
    const messages = db.prepare('SELECT * FROM messages').all() as any[];
    console.log(`Found ${messages.length} messages in SQLite`);
    for (const message of messages) {
      const { error } = await (supabaseAdmin.from('messages') as any).upsert({
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

    return NextResponse.json({ success: true, message: 'Migration complete' });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

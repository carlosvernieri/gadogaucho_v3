import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { INITIAL_LISTINGS } from '@/lib/data';

export async function GET() {
  const { count, error: countError } = await (supabaseAdmin
    .from('listings') as any)
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Supabase error checking listings count:', countError.message || countError);
    return NextResponse.json({ error: 'Failed to check listings count', details: countError.message }, { status: 500 });
  }

  // Create default admin user
  const adminEmail = 'adriano.prog@gmail.com';
  const { data: existingAdmin } = await (supabaseAdmin
    .from('users') as any)
    .select('id, is_admin')
    .eq('email', adminEmail)
    .single();

  if (!existingAdmin) {
    await (supabaseAdmin
      .from('users') as any)
      .insert([
        {
          name: 'Administrador',
          email: adminEmail,
          phone: '51999999999',
          city: 'Porto Alegre',
          password: 'admin', // In a real app, use a secure password and hash it
          is_admin: true
        }
      ]);
  } else if (!existingAdmin.is_admin) {
    // If user exists but is not admin, promote them
    await (supabaseAdmin
      .from('users') as any)
      .update({ is_admin: true })
      .eq('email', adminEmail);
  }

  if (count === 0 && (INITIAL_LISTINGS as any[]).length > 0) {
    const formattedListings = (INITIAL_LISTINGS as any[]).map(l => ({
      title: l.title,
      price: l.price,
      price_kg: l.priceKg,
      avg_weight: l.avgWeight,
      quantity: l.quantity,
      category: l.category,
      seller: l.seller,
      seller_rating: l.sellerRating,
      verified: !!l.verified,
      image: l.image,
      images: l.images,
      description: l.description,
      location: l.location || 'RS'
    }));

    const { error: insertError } = await (supabaseAdmin
      .from('listings') as any)
      .insert(formattedListings);

    if (insertError) {
      console.error('Supabase error seeding database:', insertError.message || insertError);
      return NextResponse.json({ error: 'Failed to seed database', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Database seeded successfully with admin user' });
  }

  return NextResponse.json({ message: 'Admin user checked/created. Database already has listings.' });
}

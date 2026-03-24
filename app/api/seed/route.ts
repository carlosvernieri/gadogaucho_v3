import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';

export async function GET() {
  try {
    // 1. Create 10 Creators
    const creators = [];
    for (let i = 1; i <= 10; i++) {
      const city = RS_CITIES[i % RS_CITIES.length];
      creators.push({
        name: `Criador ${i}`,
        email: `criador${i}@exemplo.com`,
        phone: `(51) 99999-000${i}`,
        city: city.name,
        password: 'password123',
        is_admin: false,
        verified: i % 2 === 0,
        rating: 4 + (i % 10) / 10
      });
    }

    const { data: createdUsers, error: userError } = await (supabaseAdmin
      .from('users') as any)
      .upsert(creators, { onConflict: 'email' })
      .select();

    if (userError) throw userError;

    // 2. Create 20 Listings (2 per creator)
    const listings = [];
    const cattleImages = [
      'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1527153376651-133464593466?auto=format&fit=crop&q=80&w=800'
    ];

    const testVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';

    for (let i = 0; i < 20; i++) {
      const creator = (createdUsers as any[])[i % (createdUsers as any[]).length];
      const category = CATEGORIES_LIST[i % CATEGORIES_LIST.length];
      const city = RS_CITIES[(i + 5) % RS_CITIES.length];
      const priceKg = 8 + Math.random() * 4;
      const weight = 200 + Math.random() * 400;
      const quantity = 1 + Math.floor(Math.random() * 50);

      listings.push({
        category: category.toUpperCase(),
        title: `${category} de Qualidade em ${city.name}`,
        price: priceKg * weight * quantity,
        price_kg: priceKg,
        avg_weight: weight,
        quantity: quantity,
        location: `${city.name.toUpperCase()} - RS`,
        lat: city.lat,
        lng: city.lng,
        user_id: creator.id,
        image: cattleImages[i % cattleImages.length],
        description: `Excelente lote de ${category.toLowerCase()} localizado em ${city.name}. Animais bem cuidados, prontos para comercialização. Entre em contato para mais detalhes.`,
        images: [
          cattleImages[i % cattleImages.length],
          cattleImages[(i + 1) % cattleImages.length]
        ],
        videos: [testVideo],
        verified: i % 3 === 0,
        sold: false
      });
    }

    const { data: createdListings, error: listingError } = await (supabaseAdmin
      .from('listings') as any)
      .insert(listings)
      .select();

    if (listingError) throw listingError;

    return NextResponse.json({
      message: 'Seed completed successfully',
      usersCount: createdUsers.length,
      listingsCount: createdListings.length
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

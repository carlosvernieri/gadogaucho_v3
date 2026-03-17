import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';

export async function GET() {
  try {
    // 1. Create Test Users
    const testUsers = [
      { name: 'João da Estância', email: 'joao@teste.com', phone: '51988887777', city: 'Uruguaiana', password: 'password123', is_admin: false },
      { name: 'Maria do Pampa', email: 'maria@teste.com', phone: '53977776666', city: 'Bagé', password: 'password123', is_admin: false },
      { name: 'Pedro Criador', email: 'pedro@teste.com', phone: '54966665555', city: 'Passo Fundo', password: 'password123', is_admin: false },
      { name: 'Ana Fazendeira', email: 'ana@teste.com', phone: '55955554444', city: 'Santa Maria', password: 'password123', is_admin: false },
      { name: 'Carlos Gado', email: 'carlos@teste.com', phone: '51944443333', city: 'Canoas', password: 'password123', is_admin: false },
    ];

    for (const u of testUsers) {
      const { data: existing } = await (supabaseAdmin
        .from('users') as any)
        .select('id')
        .eq('email', u.email)
        .maybeSingle();

      if (!existing) {
        await (supabaseAdmin
          .from('users') as any)
          .insert([u]);
      }
    }

    // 2. Generate 30 Listings
    const listings = [];
    for (let i = 1; i <= 30; i++) {
      const category = CATEGORIES_LIST[Math.floor(Math.random() * CATEGORIES_LIST.length)];
      const city = RS_CITIES[Math.floor(Math.random() * RS_CITIES.length)];
      const user = testUsers[Math.floor(Math.random() * testUsers.length)];
      
      const weight = Math.floor(Math.random() * 400) + 200; // 200-600kg
      const priceKg = (Math.random() * 5 + 8).toFixed(2); // 8.00-13.00
      const quantity = Math.floor(Math.random() * 50) + 1;
      const price = (weight * parseFloat(priceKg) * quantity).toFixed(2);

      listings.push({
        category: category.toUpperCase(),
        title: `${category} de Qualidade em ${city.name}`,
        price: parseFloat(price),
        price_kg: parseFloat(priceKg),
        avg_weight: weight,
        quantity: quantity,
        location: `${city.name.toUpperCase()} - RS`,
        lat: city.lat,
        lng: city.lng,
        seller: user.name,
        image: `https://picsum.photos/seed/cattle${i}/800/600`,
        description: `Excelente lote de ${category.toLowerCase()} localizado em ${city.name}. Animais bem cuidados, prontos para comercialização. Entre em contato para mais detalhes.`,
        images: [
          `https://picsum.photos/seed/cattle${i}_1/800/600`,
          `https://picsum.photos/seed/cattle${i}_2/800/600`
        ],
        videos: [],
        verified: Math.random() > 0.5,
        seller_rating: (Math.random() * 1.5 + 3.5).toFixed(1) // 3.5-5.0
      });
    }

    const { error: insertError } = await (supabaseAdmin
      .from('listings') as any)
      .insert(listings);

    if (insertError) throw insertError;

    return NextResponse.json({ message: '30 anúncios de teste e usuários criados com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao semear dados de teste:', error.message || error);
    return NextResponse.json({ error: 'Falha ao semear dados', details: error.message }, { status: 500 });
  }
}

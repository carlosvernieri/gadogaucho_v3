import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';
import { safeJsonStringify } from '@/lib/utils';

export async function GET() {
  try {
    // 1. Ensure admin user exists
    const { data: adminUser, error: adminError } = await (supabaseAdmin as any)
      .from('users')
      .select('id')
      .eq('email', 'admin@admin.com')
      .maybeSingle();

    let userId: any = (adminUser as any)?.id;

    if (adminError || !adminUser) {
      const { data: newUser, error: createError } = await (supabaseAdmin as any)
        .from('users')
        .insert({
          name: 'Administrador',
          email: 'admin@admin.com',
          city: 'Porto Alegre',
          phone: '(51) 99999-9999',
          password: 'admin',
          is_admin: true,
          verified: true
        })
        .select('id')
        .single();

      if (createError) throw createError;
      userId = (newUser as any).id;
    }

    // 2. Prepare 20 ads
    const ads = [];
    for (let i = 0; i < 20; i++) {
      const category = CATEGORIES_LIST[i % CATEGORIES_LIST.length];
      const cityObj = RS_CITIES[i % RS_CITIES.length];
      const quantity = Math.floor(Math.random() * 30) + 5;
      const avgWeight = Math.floor(Math.random() * 400) + 150;
      const priceKg = (Math.random() * 5 + 8).toFixed(2);
      const price = (quantity * avgWeight * parseFloat(priceKg)).toFixed(2);

      ads.push({
        category,
        title: `${quantity} ${category} - ${cityObj.name}`,
        price: parseFloat(price),
        price_kg: parseFloat(priceKg),
        avg_weight: avgWeight,
        quantity,
        location: cityObj.name,
        lat: cityObj.lat,
        lng: cityObj.lng,
        user_id: userId,
        verified: Math.random() > 0.3,
        sold: Math.random() > 0.8,
        image: `https://picsum.photos/seed/cattle-${i}/800/600`,
        description: `Excelente lote de ${quantity} ${category.toLowerCase()} em ${cityObj.name}. Animais de ótima procedência, com peso médio de ${avgWeight}kg.`,
        images: [`https://picsum.photos/seed/cattle-${i}-1/800/600`, `https://picsum.photos/seed/cattle-${i}-2/800/600`],
        videos: []
      });
    }

    // 3. Insert ads
    const { error: insertError } = await (supabaseAdmin as any)
      .from('listings')
      .insert(ads);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, message: '20 example ads inserted successfully.' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

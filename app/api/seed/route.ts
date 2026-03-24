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

    let adminId: any = (adminUser as any)?.id;

    if (adminError || !adminUser) {
      const { data: newUser, error: createError } = await (supabaseAdmin as any)
        .from('users')
        .insert({
          name: 'Administrador',
          email: 'admin@admin.com',
          city: 'Porto Alegre',
          phone: '(51) 99999-9999',
          password: 'user',
          is_admin: true,
          verified: true
        })
        .select('id')
        .single();

      if (createError) throw createError;
      adminId = (newUser as any).id;
    } else {
      // Update admin password to 'user' as requested
      await (supabaseAdmin as any)
        .from('users')
        .update({ password: 'user' })
        .eq('id', adminId);
    }

    // 2. Create sample users
    const sampleUsers = [
      { name: 'João Fazendeiro', email: 'joao@fazenda.com', city: 'Uruguaiana', phone: '(55) 98888-1111', password: 'user', verified: true },
      { name: 'Maria Pecuária', email: 'maria@pecuaria.com', city: 'Bagé', phone: '(53) 97777-2222', password: 'user', verified: true },
      { name: 'Carlos Gado', email: 'carlos@gado.com', city: 'Pelotas', phone: '(53) 96666-3333', password: 'user', verified: false },
      { name: 'Ana Rural', email: 'ana@rural.com', city: 'Santa Maria', phone: '(55) 95555-4444', password: 'user', verified: true },
      { name: 'Pedro Estância', email: 'pedro@estancia.com', city: 'Passo Fundo', phone: '(54) 94444-5555', password: 'user', verified: false },
    ];

    const userIds: any[] = [adminId];

    for (const u of sampleUsers) {
      const { data: existingUser } = await (supabaseAdmin as any)
        .from('users')
        .select('id')
        .eq('email', u.email)
        .maybeSingle();

      if (existingUser) {
        userIds.push(existingUser.id);
        // Ensure password is 'user'
        await (supabaseAdmin as any).from('users').update({ password: 'user' }).eq('id', existingUser.id);
      } else {
        const { data: newUser, error: createError } = await (supabaseAdmin as any)
          .from('users')
          .insert(u)
          .select('id')
          .single();
        
        if (!createError && newUser) {
          userIds.push(newUser.id);
        }
      }
    }

    // 3. Prepare 20 ads
    const ads = [];
    for (let i = 0; i < 20; i++) {
      const category = CATEGORIES_LIST[i % CATEGORIES_LIST.length];
      const cityObj = RS_CITIES[i % RS_CITIES.length];
      const quantity = Math.floor(Math.random() * 30) + 5;
      const avgWeight = Math.floor(Math.random() * 400) + 150;
      const priceKg = (Math.random() * 5 + 8).toFixed(2);
      const price = (quantity * avgWeight * parseFloat(priceKg)).toFixed(2);
      
      // Assign to a random user from our list
      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];

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
        user_id: randomUserId,
        verified: Math.random() > 0.3,
        sold: Math.random() > 0.8,
        image: `https://picsum.photos/seed/cattle-${i}/800/600`,
        description: `Excelente lote de ${quantity} ${category.toLowerCase()} em ${cityObj.name}. Animais de ótima procedência, com peso médio de ${avgWeight}kg.`,
        images: [`https://picsum.photos/seed/cattle-${i}-1/800/600`, `https://picsum.photos/seed/cattle-${i}-2/800/600`],
        videos: []
      });
    }

    // 4. Insert ads
    const { error: insertError } = await (supabaseAdmin as any)
      .from('listings')
      .insert(ads);

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      message: `20 example ads and ${userIds.length} users (all with password 'user') inserted successfully.` 
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

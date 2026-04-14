import React, { Suspense } from 'react';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { parseJsonField } from '@/lib/utils';
import { HomePageClient } from '@/components/HomePageClient';
import { Spinner } from '@/components/Spinner';

export const dynamic = 'force-dynamic';

async function fetchListings() {
  if (!isSupabaseConfigured()) {
    return [];
  }
  
  try {
    const { data: listings, error } = await (supabaseAdmin
      .from('listings') as any)
      .select('*, users(name, verified)')
      .or('sold.eq.false,sold.is.null')
      .order('id', { ascending: false })
      .range(0, 19);

    if (error) {
      // Fallback if users join fails
      const { data: fallbackListings, error: fallbackError } = await (supabaseAdmin
        .from('listings') as any)
        .select('*')
        .or('sold.eq.false,sold.is.null')
        .order('id', { ascending: false })
        .range(0, 19);
        
      if (fallbackError) return [];
      
      return (fallbackListings || []).map((l: any) => ({
        ...l,
        sold: !!l.sold,
        verified: !!l.verified,
        verification_requested: !!l.verification_requested,
        priceKg: l.price_kg || l.priceKg,
        avgWeight: l.avg_weight || l.avgWeight,
        images: parseJsonField(l.images),
        videos: parseJsonField(l.videos),
        seller: 'Desconhecido',
        sellerVerified: false,
        sellerRating: 0,
      }));
    }

    return listings.map((l: any) => ({
      ...l,
      sold: !!l.sold,
      verified: !!l.verified,
      verification_requested: !!l.verification_requested,
      priceKg: l.price_kg,
      avgWeight: l.avg_weight,
      images: parseJsonField(l.images),
      videos: parseJsonField(l.videos),
      seller: l.users?.name || 'Desconhecido',
      sellerVerified: !!l.users?.verified,
      sellerRating: 0,
    }));
  } catch (err) {
    console.error('Error fetching listings in RSC:', err);
    return [];
  }
}

export default async function Page() {
  const listings = await fetchListings();

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-[#2D5A27] font-bold animate-pulse">Carregando Gado Gaúcho...</p>
        </div>
      </div>
    }>
      <HomePageClient initialListings={listings} />
    </Suspense>
  );
}

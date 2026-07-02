import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { parseJsonField, getListingUrl } from '@/lib/utils';
import { AnuncioPageClient } from '@/components/AnuncioPageClient';
import { Spinner } from '@/components/Spinner';

export const dynamic = 'force-dynamic';

async function fetchListingData(id: string) {
  if (!isSupabaseConfigured()) {
    return { listing: null, listings: [] };
  }
  
  try {
    // Fetch specifically requested listing
    const { data: listingData, error } = await (supabaseAdmin
      .from('listings') as any)
      .select('*, users(name, verified)')
      .eq('id', id)
      .maybeSingle();

    let listing = listingData;
    
    if (error && !listingData) {
      const { data: fallbackListing } = await (supabaseAdmin
        .from('listings') as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      listing = fallbackListing;
    }

    if (listing) {
      listing = {
        ...listing,
        sold: !!listing.sold,
        featured: !!listing.featured,
        feature_requested: !!listing.feature_requested,
        priceKg: listing.price_kg || listing.priceKg,
        avgWeight: listing.avg_weight || listing.avgWeight,
        images: parseJsonField(listing.images),
        videos: parseJsonField(listing.videos),
        seller: listing.users?.name || 'Desconhecido',
        sellerVerified: !!listing.users?.verified,
        sellerRating: 0,
      };
    }

    // Fetch all listings for sidebar/recommendations
    const { data: allListingsData, error: allErr } = await (supabaseAdmin
      .from('listings') as any)
      .select('*, users(name, verified)')
      .order('id', { ascending: false });

    let listings = allListingsData || [];
    if (allErr) {
      const { data: fallbackListings } = await (supabaseAdmin
        .from('listings') as any)
        .select('*')
        .order('id', { ascending: false });
      listings = fallbackListings || [];
    }

    const mappedListings = listings.map((l: any) => ({
      ...l,
      sold: !!l.sold,
      featured: !!l.featured,
      priceKg: l.price_kg || l.priceKg,
      avgWeight: l.avg_weight || l.avgWeight,
      images: parseJsonField(l.images),
      videos: parseJsonField(l.videos),
      seller: l.users?.name || 'Desconhecido',
      sellerVerified: !!l.users?.verified,
    }));

    return { listing, listings: mappedListings };
  } catch (err) {
    console.error('Error fetching data in RSC:', err);
    return { listing: null, listings: [] };
  }
}

export default async function AnuncioCatchAllPage(props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params;
  const slug = params.slug;

  // SEO URL /anuncio/[cat]/[breed]/[city]/[id] (slug length is 4)
  if (slug.length === 4) {
    const id = slug[3];
    const { listing, listings } = await fetchListingData(id);

    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="flex flex-col items-center">
            <Spinner size="lg" className="mb-4" />
            <p className="text-[#2D5A27] font-bold animate-pulse">Carregando anúncio...</p>
          </div>
        </div>
      }>
        <AnuncioPageClient initialListing={listing} initialListings={listings} />
      </Suspense>
    );
  }

  // Other cases: redirect to home
  redirect('/');
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ListingDetail } from '@/components/ListingDetail';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { INITIAL_LISTINGS } from '@/lib/data';

export default function AnuncioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const [listing, setListing] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingRes, listingsRes] = await Promise.all([
          fetch(`/api/listings/${id}`),
          fetch('/api/listings')
        ]);
        
        if (listingRes.ok) {
          const data = await listingRes.json();
          setListing(data);
        }
        
        if (listingsRes.ok) {
          const data = await listingsRes.json();
          setListings(data);
        }

        const storedUser = localStorage.getItem('gado_gaucho_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleShare = (id: number) => {
    const url = `${window.location.origin}/anuncio/${id}`;
    navigator.clipboard.writeText(url);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header 
          user={user}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onAuthClick={() => router.push('/')}
          onAdClick={() => router.push('/')}
          onAdminClick={() => router.push('/')}
          onLogout={() => {
            setUser(null);
            localStorage.removeItem('gado_gaucho_user');
            router.push('/');
          }}
          onHomeClick={() => router.push('/')}
        />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-[#2D5A27] rounded-full animate-pulse" />
            </div>
          </div>
          <h3 className="mt-6 text-lg font-bold text-[#333] animate-pulse">Carregando anúncio...</h3>
          <p className="text-sm text-[#999] mt-2">Buscando detalhes da oferta</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header 
          user={user}
          onMenuClick={() => {}}
          onAuthClick={() => router.push('/')}
          onAdClick={() => router.push('/')}
          onAdminClick={() => router.push('/')}
          onLogout={() => {}}
          onHomeClick={() => router.push('/')}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#333] mb-4">Anúncio não encontrado</h1>
            <button onClick={() => router.push('/')} className="text-[#2D5A27] font-bold hover:underline">Voltar para a página inicial</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <Header 
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={() => router.push('/')}
        onAdClick={() => router.push('/')}
        onAdminClick={() => router.push('/')}
        onLogout={() => {
          setUser(null);
          localStorage.removeItem('gado_gaucho_user');
          router.push('/');
        }}
        onHomeClick={() => router.push('/')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full flex px-4 lg:px-8 py-8 gap-8 relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={listing.category}
          onSelectCategory={(cat) => {
            if (cat) router.push(`/?category=${encodeURIComponent(cat)}`);
            else router.push('/');
          }}
          searchQuery=""
          onSearchChange={() => {}}
          listingsCount={listings.length}
          getCategoryCount={(catName) => listings.filter(l => l.category.toLowerCase() === catName.toLowerCase()).length}
          citySearch=""
          onCitySearchChange={() => {}}
          maxDistance={100}
          onMaxDistanceChange={() => {}}
          onUseMyLocation={() => {}}
          citySuggestions={[]}
          onSelectCity={() => {}}
          showSuggestions={false}
          setShowSuggestions={() => {}}
        />

        <main className="flex-1">
          <ListingDetail listing={listing} onShare={handleShare} />
        </main>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-[#333] text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <div className="w-2 h-2 bg-[#2D5A27] rounded-full" />
          Link do anúncio copiado!
        </div>
      )}
    </div>
  );
}

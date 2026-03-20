'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORIES_LIST } from '@/lib/data';
import { unslugify } from '@/lib/utils';
import { ListingCard } from '@/components/ListingCard';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Search } from 'lucide-react';
import { useUser } from '@/context/UserContext';

export default function CategoriaPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, setUser, logout } = useUser();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);

  const categoryName = unslugify(slug, CATEGORIES_LIST);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/listings').catch(err => {
          console.error('Listings fetch failed:', err);
          return { ok: false, json: async () => [] } as Response;
        });
        
        const data = res.ok ? await res.json() : [];
        setListings(Array.isArray(data) && data.length > 0 ? data : []);

        const storedUser = localStorage.getItem('gado_gaucho_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // Fetch favorites
          fetch(`/api/favorites?email=${encodeURIComponent(parsedUser.email)}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) setFavorites(data);
            })
            .catch(err => console.error('Error fetching favorites:', err));
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleFavorite = async (listingId: number) => {
    if (!user) {
      router.push('/?auth=login');
      return;
    }

    const listingIdNum = Number(listingId);
    const isFavorite = favorites.map(Number).includes(listingIdNum);
    const method = isFavorite ? 'DELETE' : 'POST';

    try {
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, listingId: listingIdNum })
      });

      if (res.ok) {
        if (isFavorite) {
          setFavorites(favorites.filter(id => Number(id) !== listingIdNum));
        } else {
          setFavorites([...favorites, listingIdNum]);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      const matchesCategory = item.category.toLowerCase() === categoryName.toLowerCase();
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.id.toString().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [categoryName, searchQuery, listings]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header 
          user={user}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onAuthClick={(mode) => router.push(`/?auth=${mode}`)}
          onAdClick={() => router.push('/?ad=new')}
          onAdminClick={() => router.push('/')}
          onLogout={() => {
            setUser(null);
            localStorage.removeItem('gado_gaucho_user');
            router.push('/');
          }}
          onHomeClick={() => router.push('/')}
          onFavoritesClick={() => router.push('/favoritos')}
          onMyAdsClick={() => router.push('/meus-anuncios')}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingScreen fullScreen={false} message={`Buscando ofertas de ${categoryName}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20 lg:pb-0">
      <Header 
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => router.push(`/?auth=${mode}`)}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/')}
        onLogout={() => {
          logout();
          router.push('/');
        }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full flex px-4 lg:px-8 py-8 gap-8 relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={categoryName}
          onSelectCategory={(cat) => {
            if (!cat) router.push('/');
            else router.push(`/categoria/${cat.toLowerCase()}`);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#333] mb-2">{categoryName}</h1>
            <p className="text-[#666]">{filteredListings.length} anúncios encontrados</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredListings.map(listing => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                isFavorite={favorites.map(Number).includes(Number(listing.id))}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>

          {filteredListings.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#CED4DA]">
              <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-4 text-[#ADB5BD]">
                <Search size={32} />
              </div>
              <h3 className="text-lg font-bold text-[#333] mb-1">Nenhum anúncio encontrado</h3>
              <p className="text-sm text-[#999]">Tente ajustar seus filtros ou busca.</p>
            </div>
          )}
        </main>
      </div>

      <BottomNav 
        user={user} 
        onAdClick={() => router.push('/?ad=new')} 
        onAuthClick={() => router.push('/?auth=login')} 
      />
    </div>
  );
}

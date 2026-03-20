'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ListingCard } from '@/components/ListingCard';
import { ListingListItem } from '@/components/ListingListItem';
import { Megaphone, LayoutGrid, Menu as MenuIcon, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MeusAnunciosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchData = async () => {
      const storedUser = localStorage.getItem('gado_gaucho_user');
      if (!storedUser) {
        router.push('/?auth=login');
        return;
      }
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      try {
        const listingsRes = await fetch('/api/listings');
        if (listingsRes.ok) {
          const data = await listingsRes.json();
          setListings(data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const myAds = listings.filter(l => l.seller === user?.name);

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
          onFavoritesClick={() => router.push('/favoritos')}
          onMyAdsClick={() => {}}
          onMessagesClick={() => router.push('/mensagens')}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2D5A27]"></div>
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
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => {}}
        onMessagesClick={() => router.push('/mensagens')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full flex px-4 lg:px-8 py-8 gap-8 relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={null}
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                <Megaphone size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#333]">Meus Anúncios</h1>
                <p className="text-sm text-[#999]">Gerencie suas ofertas no Gado Gaúcho</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold text-sm hover:bg-[#1E3D1A] transition-all"
              >
                <Plus size={18} /> Novo Anúncio
              </button>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#E9ECEF]">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#2D5A27] text-white shadow-lg' : 'text-[#999] hover:bg-[#F8F9FA]'}`}
                >
                  <LayoutGrid size={20} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#2D5A27] text-white shadow-lg' : 'text-[#999] hover:bg-[#F8F9FA]'}`}
                >
                  <MenuIcon size={20} />
                </button>
              </div>
            </div>
          </div>

          {myAds.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E9ECEF] shadow-sm">
              <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 text-[#999]">
                <Megaphone size={40} />
              </div>
              <h2 className="text-xl font-bold text-[#333] mb-2">Nenhum anúncio ainda</h2>
              <p className="text-[#666] mb-8">Comece a vender seu gado agora mesmo!</p>
              <button 
                onClick={() => router.push('/')}
                className="px-8 py-3 bg-[#2D5A27] text-white font-bold rounded-xl hover:bg-[#1E3D1A] transition-all"
              >
                Criar Primeiro Anúncio
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
              <AnimatePresence mode="popLayout">
                {myAds.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    {viewMode === 'grid' ? (
                      <ListingCard 
                        listing={item} 
                        isFavorite={false}
                        onToggleFavorite={() => {}}
                        onShare={() => {}}
                      />
                    ) : (
                      <ListingListItem 
                        listing={item} 
                        isOwner={true}
                        onView={(id) => router.push(`/anuncio/${id}`)}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

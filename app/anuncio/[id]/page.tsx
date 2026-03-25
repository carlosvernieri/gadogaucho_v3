'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ListingDetail } from '@/components/ListingDetail';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ShareModal } from '@/components/ShareModal';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify } from '@/lib/utils';

export default function AnuncioPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const router = useRouter();
  const id = params?.id;
  const { user, setUser, logout } = useUser();
  const [listing, setListing] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    console.log('AnuncioPage: Fetching data for id', id);
    try {
      const [listingRes, listingsRes] = await Promise.all([
        fetch(`/api/listings/${id}`),
        fetch('/api/listings')
      ]);
      
      console.log('AnuncioPage: listingRes status', listingRes.status);
      if (listingRes.ok) {
        const data = await listingRes.json();
        console.log('AnuncioPage: listing data received', data);
        setListing(data);
      } else {
        const errorText = await listingRes.text();
        console.error('AnuncioPage: listing fetch failed', listingRes.status, errorText);
        setError(`Erro ao carregar anúncio: ${listingRes.status}`);
      }
      
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(Array.isArray(data) ? data : []);
      }

      const storedUser = localStorage.getItem('gado_gaucho_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Fetch favorites
        const favRes = await fetch(`/api/favorites?userId=${parsedUser.id}`);
        if (favRes.ok) {
          const favData = await favRes.json();
          setFavorites(favData);
        }
      }
    } catch (err: any) {
      console.error('AnuncioPage: Error fetching data:', err.message || err);
      setError('Erro de conexão ao carregar o anúncio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, setUser]);

  const handleShare = (id: number) => {
    setShowShareModal(true);
  };

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
        body: safeJsonStringify({ userId: user.id, listingId: listingIdNum })
      });

      if (res.ok) {
        if (isFavorite) {
          setFavorites(favorites.filter(id => id !== listingId));
          setToastMessage('Removido dos favoritos');
        } else {
          setFavorites([...favorites, listingId]);
          setToastMessage('Adicionado aos favoritos!');
        }
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

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
          <LoadingScreen fullScreen={false} message="Carregando anúncio..." />
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
          onFavoritesClick={() => router.push('/favoritos')}
          onMyAdsClick={() => router.push('/meus-anuncios')}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-[#333] mb-4">
              {error || 'Anúncio não encontrado'}
            </h1>
            <p className="text-[#666] mb-8">
              Não foi possível carregar os detalhes deste anúncio. Verifique o código ou tente novamente mais tarde.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => fetchData()} 
                className="px-8 py-3 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg hover:bg-[#1E3D1A] transition-all"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => router.push('/')} 
                className="px-8 py-3 bg-white text-[#2D5A27] border border-[#2D5A27] font-bold rounded-xl hover:bg-[#F8F9FA] transition-all"
              >
                Voltar para Início
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] pb-20 lg:pb-0">
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
          selectedCategory={listing.category}
          onSelectCategory={(cat) => {
            if (cat) router.push(`/?category=${encodeURIComponent(cat)}`);
            else router.push('/');
          }}
          searchQuery=""
          onSearchChange={() => {}}
          listingsCount={listings.length}
          getCategoryCount={(catName) => listings.filter(l => l.category && l.category.toLowerCase() === catName.toLowerCase()).length}
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
          <ListingDetail 
            listing={listing} 
            onShare={handleShare} 
            onToggleFavorite={handleToggleFavorite}
            isFavorite={favorites.map(Number).includes(Number(listing.id))}
          />
        </main>
      </div>

      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={typeof window !== 'undefined' ? `${window.location.origin}/anuncio/${listing.id}` : ''}
        title={listing.title}
        onCopySuccess={() => {
          setToastMessage('Link copiado!');
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 3000);
        }}
      />

      {/* Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#333] text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2"
          >
            <Check size={18} className="text-[#28A745]" /> {toastMessage || 'Link do anúncio copiado!'}
          </motion.div>
        )}
      </AnimatePresence>

      {user && (
        <BottomNav 
          user={user} 
          onAdClick={() => router.push('/?ad=new')} 
          onAuthClick={() => router.push('/?auth=login')} 
        />
      )}
    </div>
  );
}

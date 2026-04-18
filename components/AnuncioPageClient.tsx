'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ListingDetail } from '@/components/ListingDetail';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ShareModal } from '@/components/ShareModal';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify, getListingUrl } from '@/lib/utils';

export function AnuncioPageClient({ initialListing, initialListings }: { initialListing: any, initialListings: any[] }) {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { user, setUser, logout, setAuthMode, setShowAuthModal } = useUser();
  const [listing, setListing] = useState<any>(initialListing);
  const [listings, setListings] = useState<any[]>(initialListings);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Os favoritos agora são gerenciados centralmente pelo UserContext
        // Não precisamos mais carregar eles manualmente aqui via localStorage
      } catch (error: any) {
        console.error('Error fetching favorites:', error.message || error);
      }
    };
    fetchData();
  }, []);

  // Sincronizar favoritos do contexto
  const { favorites: userFavorites } = useUser();
  useEffect(() => {
    if (userFavorites) {
      setFavorites(userFavorites);
    }
  }, [userFavorites]);

  const handleShare = (id: number) => {
    setShowShareModal(true);
  };

  const handleToggleFavorite = async (listingId: number) => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
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


  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          user={user}
          onMenuClick={() => { }}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
          onAdClick={() => router.push('/')}
          onAdminClick={() => router.push('/')}
          onLogout={() => { }}
          onHomeClick={() => router.push('/')}
          onFavoritesClick={() => router.push('/favoritos')}
          onMyAdsClick={() => router.push('/meus-anuncios')}
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
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] pb-20 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
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
          onSearchChange={() => { }}
          listingsCount={listings.filter(l => !l.sold).length}
          getCategoryCount={(catName) => listings.filter(l => !l.sold && l.category.toLowerCase() === catName.toLowerCase()).length}
          citySearch=""
          onCitySearchChange={() => { }}
          maxDistance={100}
          onMaxDistanceChange={() => { }}
          onUseMyLocation={() => { }}
          citySuggestions={[]}
          onSelectCity={() => { }}
          showSuggestions={false}
          setShowSuggestions={() => { }}
        />

        <main className="flex-1 min-w-0 w-full">
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
        url={typeof window !== 'undefined' ? `${window.location.origin}${getListingUrl(listing)}` : ''}
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
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}
    </div>
  );
}

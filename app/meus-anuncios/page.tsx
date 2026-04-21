'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ListingListItem } from '@/components/ListingListItem';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmModal, showToast } from '@/components/ConfirmModal';
import { Spinner } from '@/components/Spinner';
import { Megaphone, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify, deleteMediaFromStorage, getListingUrl } from '@/lib/utils';
import { supabase } from '@/lib/supabase';


export default function MeusAnunciosPage() {
  const router = useRouter();
  const { user, isAuthReady, logout, setAuthMode, setShowAuthModal, setShowAdModal, setEditingListing } = useUser();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [isProcessingSold, setIsProcessingSold] = useState(false);
  const [isVerifyingListing, setIsVerifyingListing] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'success' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });


  const fetchData = async (userId: string) => {
    try {
      const listingsRes = await fetch(`/api/listings?userId=${userId}&limit=1000`);
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

  useEffect(() => {
    if (isAuthReady) {
      if (!user) {
        console.log('MeusAnunciosPage: Usuário não autenticado. Redirecionando...');
        setAuthMode('login');
        setShowAuthModal(true);
        router.push('/');
      } else {
        fetchData(user.id);
        
        const handleAdEvent = () => fetchData(user.id);
        window.addEventListener('ad_created', handleAdEvent);
        window.addEventListener('ad_updated', handleAdEvent);
        return () => {
          window.removeEventListener('ad_created', handleAdEvent);
          window.removeEventListener('ad_updated', handleAdEvent);
        };
      }
    }
  }, [user, isAuthReady, router]);



  const handleDeleteListing = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Anúncio',
      message: 'Tem certeza que deseja apagar este anúncio permanentemente?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const listing = listings.find(l => l.id === id);
          if (listing) {
            const allMedia = [...(listing.images || []), ...(listing.videos || [])];
            if (allMedia.length > 0) {
              await deleteMediaFromStorage(allMedia);
            }
          }
          const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchData(user.id);
            showToast('Anúncio excluído com sucesso!', 'success');
          } else {
            showToast('Erro ao excluir anúncio.', 'error');
          }
        } catch (error) {
          console.error('Error deleting listing:', error);
          showToast('Erro de conexão.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleToggleSold = async (id: number, currentStatus: boolean) => {
    setIsProcessingSold(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ sold: !currentStatus })
      });
      if (res.ok) {
        await fetchData(user.id);
        showToast(currentStatus ? 'Anúncio reativado com sucesso!' : 'Anúncio marcado como VENDIDO!', 'success');
      } else {
        showToast('Erro ao atualizar status do anúncio.', 'error');
      }
    } catch (error) {
      console.error('Error toggling sold status:', error);
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsProcessingSold(false);
    }
  };

  const handleVerifyListing = async (id: number) => {
    setIsVerifyingListing(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ verification_requested: true })
      });
      if (res.ok) {
        await fetchData(user.id);
        showToast('Solicitação de verificação enviada!', 'success');
      } else {
        showToast('Erro ao solicitar verificação.', 'error');
      }
    } catch (error) {
      console.error('Error requesting verification:', error);
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsVerifyingListing(false);
    }
  };

  const myAds = listings.filter(l => String(l.user_id) === String(user?.id));

  const openNewAdModal = () => {
    setShowAdModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          user={user}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
          onAdClick={openNewAdModal}
          onAdminClick={() => router.push('/')}
          onLogout={() => {
            logout();
            router.push('/');
          }}
          onHomeClick={() => router.push('/')}
          onFavoritesClick={() => router.push('/favoritos')}
          onMyAdsClick={() => { }}
          onMessagesClick={() => router.push('/mensagens')}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingScreen fullScreen={false} />
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
        onAdClick={openNewAdModal}
        onAdminClick={() => router.push('/')}
        onLogout={() => {
          logout();
          router.push('/');
        }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => { }}
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

        <main className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                <Megaphone size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#333]">Meus Anúncios</h1>
                <p className="text-sm text-[#999]">Gerencie suas ofertas no Gado Gaúcho</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={openNewAdModal}
                className="flex items-center gap-2 px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold text-sm hover:bg-[#1E3D1A] transition-all"
              >
                <Plus size={18} /> Novo Anúncio
              </button>
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
                onClick={openNewAdModal}
                className="px-8 py-3 bg-[#2D5A27] text-white font-bold rounded-xl hover:bg-[#1E3D1A] transition-all"
              >
                Criar Primeiro Anúncio
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
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
                    <ListingListItem
                      listing={item}
                      isOwner={true}
                      onView={() => router.push(getListingUrl(item))}
                      onEdit={(l) => {
                        setEditingListing(l);
                        setShowAdModal(true);
                      }}
                      onDelete={(id) => handleDeleteListing(id)}
                      onToggleSold={(id, status) => handleToggleSold(id, status)}
                      onVerify={(id) => handleVerifyListing(id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {user && (
        <BottomNav
          user={user}
          onAdClick={openNewAdModal}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}

      {(isProcessingSold || isVerifyingListing) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <LoadingScreen fullScreen={false} message={isVerifyingListing ? "Enviando solicitação..." : "Atualizando status..."} />
        </div>
      )}



      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}

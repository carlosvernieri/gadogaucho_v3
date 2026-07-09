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
import { Megaphone, Plus, ShieldCheck, Camera, FileText, Clock, AlertCircle, Upload, Trash2, Bell, Mail, MapPin, Loader2, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify, deleteMediaFromStorage, getListingUrl, formatCityName } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { RS_CITIES } from '@/lib/data';
import imageCompression from 'browser-image-compression';


export default function MeusAnunciosPage() {
  const router = useRouter();
  const { user, isAuthReady, logout, setAuthMode, setShowAuthModal, setShowAdModal, setEditingListing, favorites, toggleFavorite } = useUser();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    document.title = 'Meu Painel | Gado Gaúcho';
  }, []);

  const [isProcessingSold, setIsProcessingSold] = useState(false);
  const [isVerifyingListing, setIsVerifyingListing] = useState(false);

  // Estados para aba e edição de perfil
  const [activeTab, setActiveTab] = useState<'listings' | 'favorites' | 'alerts' | 'profile' | 'password' | 'verification'>('listings');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: ''
  });
  const [citySearchProfile, setCitySearchProfile] = useState('');
  const [showCitySuggestionsProfile, setShowCitySuggestionsProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
  };

  const citySuggestionsProfile = React.useMemo(() => {
    if (!showCitySuggestionsProfile) return [];
    if (citySearchProfile.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchProfile.toLowerCase()));
  }, [citySearchProfile, showCitySuggestionsProfile]);

  const { setUser } = useUser();

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone ? formatPhone(user.phone) : '',
        email: user.email || '',
        city: user.city ? formatCityName(user.city) : ''
      });
      setCitySearchProfile(user.city ? formatCityName(user.city) : '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileError(null);

    const rawPhone = profileForm.phone.replace(/\D/g, '');
    if (rawPhone.length !== 11) {
      setProfileError('O telefone deve ter formato válido: (xx) xxxx xxxxx');
      setSavingProfile(false);
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({
          name: profileForm.name,
          phone: profileForm.phone,
          city: profileForm.city,
          email: profileForm.email
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        showToast('Dados atualizados com sucesso!', 'success');
      } else {
        const err = await res.json();
        setProfileError(err.error || 'Erro ao atualizar dados');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError('Erro de conexão ao salvar alterações.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Estados para alteração de senha
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.password.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.password
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess('Senha atualizada com sucesso!');
        setPasswordForm({ password: '', confirmPassword: '' });
        showToast('Senha atualizada com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Erro de conexão ao alterar a senha.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Estados para verificação de identidade (Abordagem B)
  const [documentUrl, setDocumentUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [submittingVerif, setSubmittingVerif] = useState(false);
  const [verifError, setVerifError] = useState<string | null>(null);

  const docInputRef = React.useRef<HTMLInputElement>(null);
  const selfieInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDocumentUrl(user.verification_document_url || '');
      setSelfieUrl(user.verification_selfie_url || '');
    }
  }, [user]);

  const handleVerifUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'selfie') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('A imagem é muito grande. O limite máximo permitido é 5MB.', 'error');
      return;
    }

    if (type === 'document') setUploadingDoc(true);
    else setUploadingSelfie(true);
    setVerifError(null);

    try {
      let fileToUpload: File | Blob = file;
      let fileExt = (file.name.split('.').pop() || '').toLowerCase();

      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8,
          fileType: 'image/webp',
        };
        fileToUpload = await imageCompression(file, options);
        fileExt = 'webp';
      } catch (err) {
        console.error('Erro na compressão:', err);
      }

      const fileName = `verifications/${user.id}_${type}_${Date.now()}.${fileExt}`;
      const mimeType = 'image/webp';

      // 1. Obter URL assinada
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName, contentType: mimeType })
      });

      if (!presignRes.ok) {
        throw new Error('Falha ao obter URL de upload');
      }

      const { uploadUrl, publicUrl } = await presignRes.json();

      // 2. Upload para R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: fileToUpload
      });

      if (!uploadRes.ok) {
        throw new Error('Erro no upload para o Storage');
      }

      if (type === 'document') {
        setDocumentUrl(publicUrl);
      } else {
        setSelfieUrl(publicUrl);
      }
      showToast('Foto carregada com sucesso!', 'success');
    } catch (err: any) {
      console.error('Upload Error:', err);
      setVerifError('Erro ao enviar a imagem. Tente novamente.');
      showToast('Erro ao carregar imagem.', 'error');
    } finally {
      if (type === 'document') setUploadingDoc(false);
      else setUploadingSelfie(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!documentUrl || !selfieUrl) {
      setVerifError('Por favor, carregue ambas as fotos.');
      return;
    }

    setSubmittingVerif(true);
    setVerifError(null);

    try {
      const res = await fetch('/api/users/submit-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentUrl, selfieUrl })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        showToast('Documentos enviados para análise com sucesso!', 'success');
      } else {
        const err = await res.json();
        setVerifError(err.error || 'Erro ao enviar documentos.');
      }
    } catch (err) {
      console.error('Error submitting verification:', err);
      setVerifError('Erro de conexão ao enviar solicitação.');
    } finally {
      setSubmittingVerif(false);
    }
  };

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
      const listingsRes = await fetch('/api/listings?showAll=true&limit=1000');
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

  const fetchAlerts = async () => {
    if (!user) return;
    setLoadingAlerts(true);
    try {
      const res = await fetch('/api/opportunity-alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const handleDeleteAlert = async (id: string) => {
    setDeletingAlertId(id);
    try {
      const res = await fetch(`/api/opportunity-alerts?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Alerta removido com sucesso!', 'success');
        setAlerts(prev => prev.filter(a => a.id !== id));
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao remover alerta', 'error');
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
      showToast('Erro de rede ao remover alerta', 'error');
    } finally {
      setDeletingAlertId(null);
    }
  };

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
        body: safeJsonStringify({ feature_requested: true })
      });
      if (res.ok) {
        await fetchData(user.id);
        showToast('Solicitação de destaque enviada!', 'success');
      } else {
        showToast('Erro ao solicitar destaque.', 'error');
      }
    } catch (error) {
      console.error('Error requesting highlight:', error);
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsVerifyingListing(false);
    }
  };

  const myAds = listings.filter(l => String(l.user_id) === String(user?.id));
  const favoriteListings = listings.filter(l => favorites.map(Number).includes(Number(l.id)));

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
          onAdminClick={() => router.push('/admin')}
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
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] pb-10 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
        onAdClick={openNewAdModal}
        onAdminClick={() => router.push('/admin')}
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

        <main className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                <Megaphone size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#333]">Meu Painel</h1>
                <p className="text-sm text-[#999]">Gerencie suas ofertas e alertas no Gado Gaúcho</p>
              </div>
            </div>
            {activeTab === 'listings' && (
              <div className="flex items-center gap-4">
                <button
                  onClick={openNewAdModal}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold text-sm hover:bg-[#1E3D1A] transition-all"
                >
                  <Plus size={18} /> Novo Anúncio
                </button>
              </div>
            )}
          </div>

          {/* Alternância de Abas */}
          <div className="relative mb-8">
            {/* Gradiente de Desfoque no Lado Direito */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#F8F9FA] to-transparent pointer-events-none z-10 lg:hidden" />
            
            <div className="flex border-b border-[#E9ECEF] gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] pr-12 lg:pr-0">
              <button
                onClick={(e) => {
                  setActiveTab('listings');
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`pb-4 text-sm font-bold transition-all relative cursor-pointer shrink-0 ${activeTab === 'listings' ? 'text-[#2D5A27]' : 'text-[#999] hover:text-[#666]'
                  }`}
              >
                Meus Anúncios ({myAds.length})
                {activeTab === 'listings' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D5A27]"
                  />
                )}
              </button>
              <button
                onClick={(e) => {
                  setActiveTab('favorites');
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`pb-4 text-sm font-bold transition-all relative cursor-pointer shrink-0 ${activeTab === 'favorites' ? 'text-[#2D5A27]' : 'text-[#999] hover:text-[#666]'
                  }`}
              >
                Meus Favoritos ({favoriteListings.length})
                {activeTab === 'favorites' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D5A27]"
                  />
                )}
              </button>
              <button
                onClick={(e) => {
                  setActiveTab('alerts');
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`pb-4 text-sm font-bold transition-all relative cursor-pointer shrink-0 ${activeTab === 'alerts' ? 'text-[#2D5A27]' : 'text-[#999] hover:text-[#666]'
                  }`}
              >
                Meus Alertas ({alerts.length})
                {activeTab === 'alerts' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D5A27]"
                  />
                )}
              </button>
              <button
                onClick={(e) => {
                  setActiveTab('profile');
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`pb-4 text-sm font-bold transition-all relative cursor-pointer shrink-0 ${activeTab === 'profile' ? 'text-[#2D5A27]' : 'text-[#999] hover:text-[#666]'
                  }`}
              >
                Meus Dados / Perfil
                {activeTab === 'profile' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D5A27]"
                  />
                )}
              </button>
              <button
                onClick={(e) => {
                  setActiveTab('password');
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`pb-4 text-sm font-bold transition-all relative cursor-pointer shrink-0 ${activeTab === 'password' ? 'text-[#2D5A27]' : 'text-[#999] hover:text-[#666]'
                  }`}
              >
                Alterar Senha
                {activeTab === 'password' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D5A27]"
                  />
                )}
              </button>
              <button
                onClick={(e) => {
                  setActiveTab('verification');
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`pb-4 text-sm font-bold transition-all relative cursor-pointer shrink-0 ${activeTab === 'verification' ? 'text-[#2D5A27]' : 'text-[#999] hover:text-[#666]'
                  }`}
              >
                Verificação
                {activeTab === 'verification' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D5A27]"
                  />
                )}
              </button>
            </div>
          </div>

          {activeTab === 'listings' && (
            myAds.length === 0 ? (
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
            )
          )}

          {activeTab === 'favorites' && (
            favoriteListings.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#E9ECEF] shadow-sm">
                <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 text-[#999]">
                  <Heart size={40} />
                </div>
                <h2 className="text-xl font-bold text-[#333] mb-2">Nenhum favorito ainda</h2>
                <p className="text-[#666] mb-8">Explore os anúncios e salve os que mais lhe interessam!</p>
                <button
                  onClick={() => router.push('/')}
                  className="px-8 py-3 bg-[#2D5A27] text-white font-bold rounded-xl hover:bg-[#1E3D1A] transition-all"
                >
                  Explorar Anúncios
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {favoriteListings.map((item) => (
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
                        isOwner={false}
                        onRemoveFavorite={() => toggleFavorite(item.id)}
                        onView={() => router.push(getListingUrl(item))}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )
          )}

          {activeTab === 'alerts' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECEF] shadow-sm max-w-4xl mx-auto w-full"
            >
              <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E9ECEF]">
                <div>
                  <h2 className="text-xl font-bold text-[#333] flex items-center gap-2">
                    <span>Alertas Ativos</span>
                    <span className="bg-[#E9F0E8] text-[#2D5A27] text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {alerts.length}
                    </span>
                  </h2>
                  <p className="text-xs text-[#888] mt-1">Você será avisado por e-mail quando novos lotes de animais das categorias abaixo forem cadastrados.</p>
                </div>
                <button
                  onClick={() => router.push('/alertas')}
                  className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold text-xs hover:bg-[#1E3D1A] transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} /> Novo Alerta
                </button>
              </div>

              {loadingAlerts ? (
                <div className="py-16 flex flex-col items-center justify-center text-[#999]">
                  <Loader2 size={36} className="animate-spin text-[#2D5A27] mb-3" />
                  <span className="text-sm font-medium">Carregando seus alertas...</span>
                </div>
              ) : alerts.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-[#E9ECEF] rounded-2xl p-8 bg-slate-50/50">
                  <Bell size={40} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="font-bold text-base text-[#666] mb-1">Você não possui alertas</h3>
                  <p className="text-xs text-[#999] leading-relaxed mb-6 max-w-sm mx-auto">Cadastre alertas de oportunidades para ser notificado assim que ofertas do seu interesse entrarem no portal.</p>
                  <button
                    onClick={() => router.push('/alertas')}
                    className="px-6 py-2.5 bg-[#2D5A27] text-white font-bold rounded-xl text-xs hover:bg-[#1E3D1A] transition-all"
                  >
                    Cadastrar Primeiro Alerta
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-5 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] flex items-start justify-between gap-4 transition-all hover:bg-white hover:shadow-md hover:border-[#2D5A27]/20"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <span className="inline-block bg-[#E9F0E8] text-[#2D5A27] text-xs font-extrabold px-3 py-1 rounded-lg">
                          {alert.categoryName}
                        </span>

                        <div className="text-sm font-bold text-[#333] truncate">
                          {alert.name}
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-[#666] flex items-center gap-1.5">
                            <Mail size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{alert.email}</span>
                          </div>

                          <div className="text-xs text-[#666] flex items-center gap-1.5">
                            <MapPin size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{alert.location || 'Qualquer Município'}</span>
                          </div>
                        </div>

                        {(alert.minPrice !== null || alert.maxPrice !== null || alert.minWeight !== null || alert.maxWeight !== null) && (
                          <div className="text-[11px] text-[#555] bg-slate-100/80 p-3 rounded-xl mt-3 space-y-1">
                            {(alert.minPrice !== null || alert.maxPrice !== null) && (
                              <div>
                                <strong>Preço:</strong> {alert.minPrice !== null ? `R$ ${alert.minPrice.toLocaleString('pt-BR')}/kg` : 'R$ 0/kg'} até {alert.maxPrice !== null ? `R$ ${alert.maxPrice.toLocaleString('pt-BR')}/kg` : 'Sem limite'}
                              </div>
                            )}
                            {(alert.minWeight !== null || alert.maxWeight !== null) && (
                              <div>
                                <strong>Peso:</strong> {alert.minWeight !== null ? `${alert.minWeight} kg` : '0 kg'} até {alert.maxWeight !== null ? `${alert.maxWeight} kg` : 'Sem limite'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        disabled={deletingAlertId === alert.id}
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                        title="Remover alerta"
                      >
                        {deletingAlertId === alert.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECEF] shadow-sm max-w-xl mx-auto w-full"
            >
              <h2 className="text-xl font-bold text-[#333] mb-6">Seus Dados Cadastrais</h2>

              {profileError && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                  {profileError}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                    Nome Completo <span className="text-[#DC3545]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Seu nome completo"
                    className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Telefone <span className="text-[#DC3545]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000 0000"
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Município <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={citySearchProfile}
                        onChange={(e) => {
                          setCitySearchProfile(e.target.value);
                          setProfileForm({ ...profileForm, city: e.target.value });
                          setShowCitySuggestionsProfile(true);
                        }}
                        onFocus={() => setShowCitySuggestionsProfile(true)}
                        onBlur={() => setTimeout(() => setShowCitySuggestionsProfile(false), 200)}
                        placeholder="Busque o município..."
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                      {citySuggestionsProfile.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                          {citySuggestionsProfile.map((city: any) => (
                            <button
                              key={city.name}
                              type="button"
                              onMouseDown={() => {
                                setProfileForm({ ...profileForm, city: city.name });
                                setCitySearchProfile(formatCityName(city.name));
                                setShowCitySuggestionsProfile(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span>{formatCityName(city.name)}</span>
                              <span className="text-[10px] text-[#999]">RS</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                    E-mail <span className="text-[#DC3545]">*</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profileForm.email}
                    className="w-full bg-[#E9ECEF] border border-transparent rounded-xl px-4 py-3 text-sm text-[#6C757D] outline-none cursor-not-allowed"
                  />
                  <span className="text-[9px] text-[#999] ml-2 mt-1 block">
                    O e-mail não pode ser alterado por motivos de segurança.
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {savingProfile ? (
                      <>
                        <Spinner size="sm" className="text-white" /> Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'password' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECEF] shadow-sm max-w-xl mx-auto w-full"
            >
              <h2 className="text-xl font-bold text-[#333] mb-6">Alterar Sua Senha</h2>

              {passwordError && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-xl text-xs font-bold mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                    Nova Senha <span className="text-[#DC3545]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                    Confirmar Nova Senha <span className="text-[#DC3545]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Repita a nova senha"
                    className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {changingPassword ? (
                      <>
                        <Spinner size="sm" className="text-white" /> Atualizando...
                      </>
                    ) : (
                      'Atualizar Senha'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'verification' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECEF] shadow-sm max-w-xl mx-auto w-full"
            >
              {(() => {
                const status = user?.verification_status || (user?.verified ? 'verified' : 'none');

                if (status === 'verified') {
                  return (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-[#E9F0E8] rounded-full flex items-center justify-center mx-auto mb-6 text-[#2D5A27] border-4 border-white shadow-md">
                        <ShieldCheck size={44} className="stroke-[2.5]" />
                      </div>
                      <h2 className="text-2xl font-bold text-[#333] mb-2">Sua Conta está Verificada!</h2>
                      <p className="text-sm text-[#666] max-w-sm mx-auto mb-8 leading-relaxed">
                        Parabéns! Você já possui o selo de vendedor verificado ativo. Seus anúncios ganharam destaque e prioridade no Gado Gaúcho.
                      </p>
                      <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#E9ECEF] max-w-md mx-auto text-left space-y-3">
                        <h3 className="font-bold text-xs text-[#999] uppercase">Benefícios Ativos:</h3>
                        <ul className="text-xs text-[#666] space-y-2 list-disc pl-4">
                          <li>Exibição do selo verde <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-bold shadow-sm"><ShieldCheck size={10} />VERIFICADO</span> em seu perfil de vendedor.</li>
                          <li>Selo de verificação visível em todas as fotos de seus anúncios.</li>
                          <li>Prioridade na ordenação dos resultados de busca de animais.</li>
                          <li>Filtro exclusivo para compradores interessados apenas em anúncios verificados.</li>
                        </ul>
                      </div>
                    </div>
                  );
                }

                if (status === 'pending') {
                  return (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-[#FEF9E7] rounded-full flex items-center justify-center mx-auto mb-6 text-[#F39C12] border-4 border-white shadow-md">
                        <Clock size={44} className="stroke-[2px] animate-pulse" />
                      </div>
                      <h2 className="text-2xl font-bold text-[#333] mb-2">Verificação em Análise</h2>
                      <p className="text-sm text-[#666] max-w-sm mx-auto mb-8 leading-relaxed">
                        Sua solicitação de verificação foi enviada com sucesso! Nossos administradores estão revisando suas fotos de identificação. Isso pode levar até 24 horas.
                      </p>
                      <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#E9ECEF] max-w-md mx-auto text-left space-y-4">
                        <h3 className="font-bold text-xs text-[#999] uppercase border-b border-[#E9ECEF] pb-2">Documentação Enviada</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {documentUrl && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-[#999] font-bold uppercase">Documento</span>
                              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#E9ECEF] bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={documentUrl} alt="Documento enviado" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          )}
                          {selfieUrl && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-[#999] font-bold uppercase">Selfie</span>
                              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#E9ECEF] bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={selfieUrl} alt="Selfie enviada" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Caso status === 'none' ou status === 'rejected'
                return (
                  <div className="py-2">
                    <div className="w-16 h-16 bg-[#E9F0E8] rounded-2xl flex items-center justify-center text-[#2D5A27] mb-6 shadow-sm">
                      <ShieldCheck size={32} className="stroke-[2px]" />
                    </div>
                    <h2 className="text-xl font-bold text-[#333] mb-2">Solicitar Selo Verificado</h2>
                    <p className="text-sm text-[#666] mb-6 leading-relaxed">
                      Destaque-se como um vendedor confiável no Gado Gaúcho. A verificação de identidade garante aos compradores que você é um produtor real e aumenta seus contatos em até 3x.
                    </p>

                    {status === 'rejected' && (
                      <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl text-xs mb-6 space-y-2">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                          <span>Solicitação de Verificação Rejeitada</span>
                        </div>
                        {user?.verification_rejected_reason && (
                          <p className="pl-6 text-[#852B2B]">
                            <strong>Motivo:</strong> {user.verification_rejected_reason}
                          </p>
                        )}
                        <p className="pl-6 text-[#9E3E3E] font-medium">
                          Por favor, envie novas fotos legíveis para realizar uma nova análise.
                        </p>
                      </div>
                    )}

                    <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#E9ECEF] mb-6">
                      <h3 className="font-bold text-xs text-[#999] uppercase mb-4">Instruções para envio:</h3>
                      <ol className="text-xs text-[#666] space-y-3 list-decimal pl-4">
                        <li><strong>Foto do Documento (RG ou CNH):</strong> Tire uma foto bem focada da frente do seu documento. Os dados devem estar completamente legíveis.</li>
                        <li><strong>Selfie Segurando o Documento:</strong> Tire uma foto do seu rosto segurando o mesmo documento ao lado. Certifique-se de que tanto o seu rosto quanto os dados do documento estejam nítidos.</li>
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                      {/* Document Upload Area */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-2 ml-2">Documento (RG ou CNH)</label>
                        <input
                          type="file"
                          ref={docInputRef}
                          onChange={(e) => handleVerifUpload(e, 'document')}
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingDoc}
                        />
                        {uploadingDoc ? (
                          <div className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#E9ECEF] bg-white flex flex-col items-center justify-center">
                            <Spinner size="md" />
                            <span className="text-[10px] font-bold text-[#999] uppercase mt-2">Enviando...</span>
                          </div>
                        ) : documentUrl ? (
                          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#E9ECEF] bg-white group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={documentUrl} alt="Documento" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setDocumentUrl('')}
                              className="absolute top-2 right-2 bg-white/90 text-red-500 p-2 rounded-full shadow hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => docInputRef.current?.click()}
                            className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#E9ECEF] hover:border-[#2D5A27] bg-[#F8F9FA] hover:bg-[#E9F0E8]/20 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <FileText size={28} className="text-[#999]" />
                            <span className="text-[10px] font-bold text-[#666] uppercase">Adicionar Documento</span>
                          </button>
                        )}
                      </div>

                      {/* Selfie Upload Area */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-2 ml-2">Selfie com Documento</label>
                        <input
                          type="file"
                          ref={selfieInputRef}
                          onChange={(e) => handleVerifUpload(e, 'selfie')}
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingSelfie}
                        />
                        {uploadingSelfie ? (
                          <div className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#E9ECEF] bg-white flex flex-col items-center justify-center">
                            <Spinner size="md" />
                            <span className="text-[10px] font-bold text-[#999] uppercase mt-2">Enviando...</span>
                          </div>
                        ) : selfieUrl ? (
                          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#E9ECEF] bg-white group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setSelfieUrl('')}
                              className="absolute top-2 right-2 bg-white/90 text-red-500 p-2 rounded-full shadow hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => selfieInputRef.current?.click()}
                            className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#E9ECEF] hover:border-[#2D5A27] bg-[#F8F9FA] hover:bg-[#E9F0E8]/20 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <Camera size={28} className="text-[#999]" />
                            <span className="text-[10px] font-bold text-[#666] uppercase">Adicionar Selfie</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {verifError && (
                      <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                        {verifError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSubmitVerification}
                      disabled={uploadingDoc || uploadingSelfie || submittingVerif || !documentUrl || !selfieUrl}
                      className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submittingVerif ? (
                        <>
                          <Spinner size="sm" className="text-white" /> Enviando Documentos...
                        </>
                      ) : (
                        <>
                          <Upload size={18} /> Enviar para Análise
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
            </motion.div>
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

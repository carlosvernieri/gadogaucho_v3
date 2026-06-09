'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmModal, showToast } from '@/components/ConfirmModal';
import { Spinner } from '@/components/Spinner';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { safeJsonStringify, generateVideoThumbnail, deleteMediaFromStorage } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  LayoutGrid,
  ShieldCheck,
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  Megaphone,
  Heart,
  Loader2,
  Camera,
  Video,
  HardDrive,
  Calendar
} from 'lucide-react';
import { AdminAuctionManager } from '@/components/AdminAuctionManager';
import { AdminCalculatorSuggestions } from '@/components/AdminCalculatorSuggestions';
import Image from 'next/image';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';
import imageCompression from 'browser-image-compression';

const formatPhone = (val: string) => {
  if (!val) return '';
  let v = val.replace(/\D/g, '');
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length > 2) v = `(${v.substring(0, 2)}) ` + v.substring(2);
  if (v.length > 9) v = v.substring(0, 9) + ' ' + v.substring(9);
  return v;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthReady, logout } = useUser();
  const [loading, setLoading] = useState(true);
  const [adminTab, setAdminTab] = useState<'users' | 'listings' | 'verifications' | 'system' | 'auctions' | 'suggestions' | 'ocr-audit'>('users');
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);
  const [isSyncingMarket, setIsSyncingMarket] = useState(false);
  const [marketData, setMarketData] = useState<any>(null);
  const [promptConfig, setPromptConfig] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [ocrAuditRecords, setOcrAuditRecords] = useState<any[]>([]);
  const [loadingOcrAudit, setLoadingOcrAudit] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);

  const [usersPage, setUsersPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [listingsSearch, setListingsSearch] = useState('');
  const [tempListingsSearch, setTempListingsSearch] = useState('');
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const ITEMS_PER_PAGE = 50;

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', city: '', password: '' });
  const [citySearchAuth, setCitySearchAuth] = useState('');
  const [showAuthSuggestions, setShowAuthSuggestions] = useState(false);
  const citySuggestionsAuth = React.useMemo(() => {
    if (!showAuthSuggestions) return [];
    if (citySearchAuth.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAuth.toLowerCase()));
  }, [citySearchAuth, showAuthSuggestions]);

  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);
  const [adForm, setAdForm] = useState({
    title: '',
    category: '',
    breed: '',
    price: 0,
    priceKg: 0,
    avgWeight: 0,
    quantity: 0,
    location: '',
    description: '',
    images: [] as string[],
    videos: [] as string[]
  });

  const [citySearchAd, setCitySearchAd] = useState('');
  const [showAdSuggestions, setShowAdSuggestions] = useState(false);

  const citySuggestionsAd = React.useMemo(() => {
    if (!showAdSuggestions) return [];
    if (citySearchAd.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAd.toLowerCase()));
  }, [citySearchAd, showAdSuggestions]);

  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const totalPrice = React.useMemo(() => {
    return adForm.avgWeight * adForm.priceKg;
  }, [adForm.avgWeight, adForm.priceKg]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    const newFiles: string[] = [];
    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (type === 'images' && file.size > 5 * 1024 * 1024) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        showToast(`A imagem é muito grande (${fileSizeMB}MB). O limite máximo permitido é 5MB.`, 'error');
        continue;
      }
      if (type === 'videos' && file.size > 50 * 1024 * 1024) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        showToast(`O vídeo é muito grande (${fileSizeMB}MB). O limite máximo permitido é 50MB.`, 'error');
        continue;
      }

      try {
        let fileToUpload: File | Blob = file;

        if (type === 'images') {
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.8,
            };
            fileToUpload = await imageCompression(file, options);
          } catch (error) {
            console.error('Erro na compressão:', error);
          }
        }

        const fileExt = (file.name.split('.').pop() || '').toLowerCase();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('gado_gaucho_media')
          .upload(filePath, fileToUpload, {
            contentType: type === 'images' ? 'image/webp' : (file.type || undefined),
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('gado_gaucho_media')
          .getPublicUrl(filePath);

        newFiles.push(data.publicUrl);

        if (type === 'videos' && adForm.images.length === 0 && newImages.length === 0) {
          try {
            const thumbBlob = await generateVideoThumbnail(file);
            const thumbName = `thumb_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
            const { error: thumbErr } = await supabase.storage
              .from('gado_gaucho_media')
              .upload(`images/${thumbName}`, thumbBlob, {
                contentType: 'image/jpeg',
                upsert: false
              });

            if (!thumbErr) {
              const { data: thumbData } = supabase.storage
                .from('gado_gaucho_media')
                .getPublicUrl(`images/${thumbName}`);
              newImages.push(thumbData.publicUrl);
            }
          } catch (err) {
            console.error('Failed to generate video thumbnail:', err);
          }
        }

      } catch (err) {
        console.error('Upload Error:', err);
        showToast(`Erro ao enviar ${file.name}.`);
      }
    }

    setAdForm((prev) => {
      if (type === 'videos') {
        return {
          ...prev,
          videos: [...prev.videos, ...newFiles],
          images: newImages.length > 0 ? [...prev.images, ...newImages] : prev.images
        };
      } else {
        return {
          ...prev,
          images: [...prev.images, ...newFiles]
        };
      }
    });
    e.target.value = '';

    if (newFiles.length > 0) {
      showToast('Mídia atualizada com sucesso!');
    }
    setIsUploadingMedia(false);
  };

  const removeFile = (index: number, type: 'images' | 'videos') => {
    const fileUrl = adForm[type][index];
    if (fileUrl) {
      if (editingListingId) {
        setMediaToDelete(prev => [...prev, fileUrl]);
      } else {
        deleteMediaFromStorage([fileUrl]);
      }
    }
    setAdForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setAdForm(prev => {
      const newImages = [...prev.images];
      if (direction === 'left' && index > 0) {
        const temp = newImages[index - 1];
        newImages[index - 1] = newImages[index];
        newImages[index] = temp;
      } else if (direction === 'right' && index < newImages.length - 1) {
        const temp = newImages[index + 1];
        newImages[index + 1] = newImages[index];
        newImages[index] = temp;
      }
      return { ...prev, images: newImages };
    });
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

  const handleStorageCleanup = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Storage?',
      message: 'Esta ação varrerá o repositório de mídias e removerá definitivamente as imagens e vídeos que não estão mais atrelados a nenhum anúncio existente.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsCleaningStorage(true);
        try {
          const res = await fetch('/api/admin/storage-cleanup', { method: 'POST' });
          if (res.ok) {
             const data = await res.json();
             showToast(data.removed > 0 ? `Limpeza concluída! ${data.removed} arquivos removidos. (${data.checked} checados)` : `Nenhum arquivo órfão encontrado. (${data.checked} checados)`);
          } else {
             const err = await res.json();
             showToast(err.error || 'Erro ao limpar storage.', 'error');
          }
        } catch (error) {
          showToast('Erro ao contatar o servidor.', 'error');
        } finally {
          setIsCleaningStorage(false);
        }
      }
    });
  };

  const handleSyncMarket = async () => {
    setIsSyncingMarket(true);
    try {
      const res = await fetch('/api/admin/market-sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Indicadores sincronizados!');
        setMarketData(data.data);
      } else {
        showToast(data.error || 'Erro na sincronização.', 'error');
      }
    } catch (error) {
      showToast('Erro ao conectar com a API.', 'error');
    } finally {
      setIsSyncingMarket(false);
    }
  };

  const fetchMarketStatus = async () => {
    try {
      const res = await fetch('/api/admin/market-sync');
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
      }
    } catch (e) { }
  };

  const fetchPromptConfig = async () => {
    try {
      const res = await fetch('/api/admin/market-sync/save-prompt');
      if (res.ok) {
        const data = await res.json();
        setPromptConfig(data.prompt || '');
      }
    } catch (err) {}
  };

  const fetchOcrAudit = async () => {
    setLoadingOcrAudit(true);
    try {
      const res = await fetch('/api/admin/auctions/ocr-audit');
      if (res.ok) {
        const data = await res.json();
        setOcrAuditRecords(data);
      }
    } catch (err) {}
    setLoadingOcrAudit(false);
  };

  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    try {
      const res = await fetch('/api/admin/market-sync/save-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ prompt: promptConfig })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Instruções do prompt salvas com sucesso!', 'success');
      } else {
        showToast(data.error || 'Erro ao salvar prompt.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    }
    setIsSavingPrompt(false);
  };

  const handleSaveSummary = async () => {
    setIsSavingSummary(true);
    try {
      const res = await fetch('/api/admin/market-sync/save-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ aiSummary: editedSummary })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Resumo de IA atualizado com sucesso!', 'success');
        setMarketData((prev: any) => ({ ...prev, aiSummary: editedSummary }));
      } else {
        showToast(data.error || 'Erro ao salvar resumo.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    }
    setIsSavingSummary(false);
  };

  useEffect(() => {
    if (marketData?.aiSummary) {
      setEditedSummary(marketData.aiSummary);
    }
  }, [marketData]);

  useEffect(() => {
    if (isAuthReady) {
      if (!user || !user.is_admin) {
        console.log('AdminPage: Acesso negado ou não autenticado. Redirecionando...');
        router.push('/');
      } else {
        fetchData();
        fetchMarketStatus();
        fetchPromptConfig();
      }
      setLoading(false);
    }
  }, [user, isAuthReady, router]);

  const fetchData = async () => {
    await Promise.all([fetchUsers(1, usersSearch), fetchListings(1, listingsSearch)]);
  };

  const fetchUsers = async (page: number = usersPage, search: string = usersSearch) => {
    try {
      const res = await fetch(`/api/users?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const users = await res.json();
        setAllUsers(users);
        setHasMoreUsers(users.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchListings = async (page: number = listingsPage, search: string = listingsSearch) => {
    try {
      const res = await fetch(`/api/listings?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(search)}&showAll=true`);
      if (res.ok) {
        const allListings = await res.json();
        setListings(allListings);
        setHasMoreListings(allListings.length === ITEMS_PER_PAGE);
        setVerificationRequests(allListings.filter((l: any) => l.verification_requested && !l.verified));
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  useEffect(() => {
    if (adminTab === 'users') {
      fetchUsers(usersPage, usersSearch);
    } else if (adminTab === 'listings') {
      fetchListings(listingsPage, listingsSearch);
    } else if (adminTab === 'ocr-audit') {
      fetchOcrAudit();
    }
  }, [usersPage, listingsPage, adminTab]);

  const handleSearchUsers = (e: React.FormEvent) => {
    e.preventDefault();
    setUsersPage(1);
    fetchUsers(1, usersSearch);
  };

  const handleSearchListings = (e: React.FormEvent) => {
    e.preventDefault();
    setListingsPage(1);
    setListingsSearch(tempListingsSearch);
    fetchListings(1, tempListingsSearch);
  };

  const handleEditUser = (u: any) => {
    setEditingUser(u);
    setAuthForm({
      name: u.name,
      email: u.email,
      phone: u.phone ? formatPhone(u.phone) : '',
      city: u.city || '',
      password: ''
    });
    setCitySearchAuth(u.city || '');
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Usuário',
      message: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setAllUsers(prev => prev.filter(u => u.id !== id));
            showToast('Usuário excluído com sucesso!', 'success');
          } else {
            showToast('Erro ao excluir usuário.', 'error');
          }
        } catch (error) {
          console.error('Error deleting user:', error);
          showToast('Erro de conexão.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleToggleUserVerified = async (u: any) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ verified: !u.verified })
      });
      if (res.ok) {
        setAllUsers(allUsers.map(user => user.id === u.id ? { ...user, verified: !u.verified } : user));
      }
    } catch (error) {
      console.error('Error toggling user verification:', error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authForm.phone) {
      const rawPhone = authForm.phone.replace(/\D/g, '');
      if (rawPhone.length !== 11) {
        showToast('O telefone deve ter formato válido: (xx) xxxx xxxxx', 'error');
        return;
      }
    }
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({
          name: authForm.name,
          email: authForm.email,
          phone: authForm.phone,
          city: authForm.city
        })
      });
      if (res.ok) {
        setShowUserModal(false);
        setEditingUser(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authForm.phone) {
      const rawPhone = authForm.phone.replace(/\D/g, '');
      if (rawPhone.length !== 11) {
        showToast('O telefone deve ter formato válido: (xx) xxxx xxxxx', 'error');
        return;
      }
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(authForm)
      });
      if (res.ok) {
        setShowUserModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleApproveVerification = async (id: number) => {
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ verified: true, verification_requested: false })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error approving verification:', error);
    }
  };

  const handleRejectVerification = async (id: number) => {
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ verification_requested: false })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error rejecting verification:', error);
    }
  };

  const handleDeleteListing = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Anúncio',
      message: 'Tem certeza que deseja excluir este anúncio?',
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
            fetchData();
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

  const handleToggleListingVerified = async (l: any) => {
    try {
      const res = await fetch(`/api/listings/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ verified: !l.verified })
      });
      if (res.ok) {
        setListings(listings.map(listing => listing.id === l.id ? { ...listing, verified: !l.verified } : listing));
      }
    } catch (error) {
      console.error('Error toggling listing verification:', error);
    }
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingListing(true);
    try {
      const cityData = RS_CITIES.find(c => c.name.toLowerCase() === citySearchAd.toLowerCase());

      const payload = {
        ...adForm,
        price: totalPrice,
        location: adForm.location || (citySearchAd ? `${citySearchAd} - RS` : ''),
        lat: cityData?.lat || null,
        lng: cityData?.lng || null,
        image: adForm.images.length > 0 ? adForm.images[0] : null
      };

      const res = await fetch(`/api/listings/${editingListingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(payload)
      });
      if (res.ok) {
        if (mediaToDelete.length > 0) {
          await deleteMediaFromStorage(mediaToDelete);
          setMediaToDelete([]);
        }
        setShowAdModal(false);
        setEditingListingId(null);
        await fetchData();
        showToast('Anúncio atualizado com sucesso!', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Erro ao atualizar anúncio. ${err.error || ''}`, 'error');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsUpdatingListing(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Acessando painel administrativo..." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] pb-20 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => { }}
        onAuthClick={() => { }}
        onAdClick={() => { }}
        onAdminClick={() => router.push('/admin')}
        onLogout={() => {
          logout();
          router.push('/');
        }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full px-4 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#333]">Painel Administrativo</h2>
              <div className="flex items-center gap-4 mt-4">
                <button
                  onClick={() => setAdminTab('users')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${adminTab === 'users' ? 'bg-[#2D5A27] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E9ECEF]'}`}
                >
                  Usuários
                </button>
                <button
                  onClick={() => setAdminTab('listings')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${adminTab === 'listings' ? 'bg-[#2D5A27] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E9ECEF]'}`}
                >
                  Anúncios
                </button>
                <button
                  onClick={() => setAdminTab('verifications')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${adminTab === 'verifications' ? 'bg-[#2D5A27] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E9ECEF]'}`}
                >
                  Verificações
                  {verificationRequests.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {verificationRequests.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setAdminTab('auctions')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${adminTab === 'auctions' ? 'bg-[#2D5A27] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E9ECEF]'}`}
                >
                  Leilões
                </button>
                <button
                  onClick={() => setAdminTab('system')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${adminTab === 'system' ? 'bg-[#2D5A27] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E9ECEF]'}`}
                >
                  Sistema
                </button>
                <button
                  onClick={() => setAdminTab('suggestions')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${adminTab === 'suggestions' ? 'bg-[#2D5A27] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E9ECEF]'}`}
                >
                  Sugestões
                </button>
                <button
                  onClick={() => setAdminTab('ocr-audit')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${adminTab === 'ocr-audit' ? 'bg-[#2D5A27] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E9ECEF]'}`}
                >
                  Auditoria OCR
                </button>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-[#666] hover:text-[#333] flex items-center gap-2 cursor-pointer"
            >
              <ChevronLeft size={20} /> Voltar ao Site
            </button>
          </div>

          <div className="space-y-8">
            {adminTab === 'users' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#333] flex items-center gap-2">
                    <User size={20} className="text-[#2D5A27]" /> Gerenciar Usuários
                  </h3>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setAuthForm({ name: '', email: '', phone: '', city: '', password: '' });
                      setCitySearchAuth('');
                      setShowUserModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#2D5A27] text-white rounded-lg text-[10px] font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={14} /> Novo Usuário
                  </button>
                </div>

                <form onSubmit={handleSearchUsers} className="mb-6 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou e-mail..."
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:outline-none focus:border-[#2D5A27] transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#2D5A27] text-white rounded-xl text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer"
                  >
                    Buscar
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E9ECEF] text-[#999] font-bold text-[10px] uppercase tracking-wider">
                        <th className="pb-4 px-4">Nome</th>
                        <th className="pb-4 px-4">E-mail</th>
                        <th className="pb-4 px-4">Cidade</th>
                        <th className="pb-4 px-4">Status</th>
                        <th className="pb-4 px-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F8F9FA]">
                      {allUsers.map(u => (
                        <tr key={u.id} className="hover:bg-[#F8F9FA] transition-colors">
                          <td className="py-4 px-4 font-bold text-[#333]">
                            <div className="flex items-center gap-2">
                              {u.name}
                              {u.is_admin && <span className="text-[9px] bg-[#E9F0E8] text-[#2D5A27] px-1.5 py-0.5 rounded">ADMIN</span>}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-[#666]">{u.email}</td>
                          <td className="py-4 px-4 text-[#666]">{u.city}</td>
                          <td className="py-4 px-4">
                            {u.verified ? (
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                                <ShieldCheck size={10} /> VERIFICADO
                              </span>
                            ) : (
                              <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-1 rounded-full font-bold w-fit">
                                PENDENTE
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleUserVerified(u)}
                                className={`p-2 rounded-lg transition-all cursor-pointer ${u.verified ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={u.verified ? "Remover Verificação" : "Marcar como Verificado"}
                              >
                                <ShieldCheck size={16} />
                              </button>
                              <button
                                onClick={() => handleEditUser(u)}
                                className="p-2 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-lg transition-all cursor-pointer"
                                title="Editar Usuário"
                              >
                                <Pencil size={16} />
                              </button>
                              {!u.is_admin && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-2 text-[#DC3545] hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Excluir Usuário"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#F8F9FA]">
                  <span className="text-xs text-[#999] font-medium">Página {usersPage}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                      disabled={usersPage === 1}
                      className="p-2 bg-[#F8F9FA] text-[#666] rounded-lg hover:bg-[#E9ECEF] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setUsersPage(prev => prev + 1)}
                      disabled={!hasMoreUsers}
                      className="p-2 bg-[#F8F9FA] text-[#666] rounded-lg hover:bg-[#E9ECEF] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

              </div>
            ) : adminTab === 'verifications' ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <ShieldCheck className="text-[#2D5A27]" size={20} />
                  <h3 className="text-lg font-bold text-[#333]">Solicitações de Verificação de Anúncios</h3>
                </div>

                <div className="flex flex-col gap-4">
                  {verificationRequests.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[#E9ECEF] text-[#999] font-bold text-[10px] uppercase tracking-wider">
                            <th className="pb-4 px-4">Anúncio</th>
                            <th className="pb-4 px-4">Preço</th>
                            <th className="pb-4 px-4">Vendedor</th>
                            <th className="pb-4 px-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verificationRequests.map(req => (
                            <tr key={req.id} className="border-b border-[#F8F9FA] hover:bg-[#F8F9FA]/50 transition-colors group">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-sm bg-gray-100">
                                    <Image src={req.image} alt={req.title} fill className="object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-[#333] text-sm truncate max-w-[200px]">{req.title}</span>
                                    <span className="text-[10px] text-[#999]">{req.location}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm font-bold text-[#2D5A27]">R$ {req.price.toLocaleString('pt-BR')}</span>
                              </td>
                              <td className="py-4 px-4 text-sm text-[#666]">{req.seller}</td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApproveVerification(req.id)}
                                    className="p-2 bg-[#2D5A27] text-white rounded-lg hover:bg-[#1E3D1A] transition-all cursor-pointer shadow-sm"
                                    title="Aprovar"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectVerification(req.id)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all cursor-pointer"
                                    title="Rejeitar"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="col-span-full py-20 text-center bg-[#F8F9FA] rounded-3xl border border-dashed border-[#E9ECEF]">
                      <ShieldCheck size={48} className="text-[#999] mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-bold text-[#333]">Nenhuma solicitação pendente</p>
                      <p className="text-sm text-[#666]">Novas solicitações de verificação aparecerão aqui.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : adminTab === 'listings' ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <LayoutGrid size={20} className="text-[#2D5A27]" />
                  <h3 className="text-lg font-bold text-[#333]">Gerenciar Todos os Anúncios</h3>
                </div>

                <form onSubmit={handleSearchListings} className="mb-6 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar por código ou nome do vendedor..."
                      value={tempListingsSearch}
                      onChange={(e) => setTempListingsSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:outline-none focus:border-[#2D5A27] transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#2D5A27] text-white rounded-xl text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer"
                  >
                    Buscar
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E9ECEF] text-[#999] font-bold text-[10px] uppercase tracking-wider">
                        <th className="pb-4 px-4">Cód</th>
                        <th className="pb-4 px-4">Título</th>
                        <th className="pb-4 px-4">Vendedor</th>
                        <th className="pb-4 px-4">Status</th>
                        <th className="pb-4 px-4">Cadastro</th>
                        <th className="pb-4 px-4">Preço</th>
                        <th className="pb-4 px-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F8F9FA]">
                      {listings.map(l => (
                        <tr key={l.id} className="hover:bg-[#F8F9FA] transition-colors">
                          <td className="py-4 px-4 text-[#999]">#{l.id}</td>
                          <td className="py-4 px-4 font-bold text-[#333]">{l.title}</td>
                          <td className="py-4 px-4 text-[#666]">{l.seller}</td>
                          <td className="py-4 px-4">
                            {l.verified ? (
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">VERIFICADO</span>
                            ) : l.verification_requested ? (
                              <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-bold">SOLICITADO</span>
                            ) : (
                              <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-1 rounded-full font-bold">PENDENTE</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-[#666] text-xs">
                            {l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '---'}
                          </td>
                          <td className="py-4 px-4 text-[#2D5A27] font-bold">R$ {l.price.toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleListingVerified(l)}
                                className={`p-2 rounded-lg transition-all cursor-pointer ${l.verified ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={l.verified ? "Remover Verificação" : "Marcar como Verificado"}
                              >
                                <ShieldCheck size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingListingId(l.id);
                                  setAdForm({
                                    title: l.title || '',
                                    category: l.category || '',
                                    breed: l.breed || '',
                                    price: l.price || 0,
                                    priceKg: l.priceKg || 0,
                                    avgWeight: l.avgWeight || 0,
                                    quantity: l.quantity || 0,
                                    location: l.location || '',
                                    description: l.description || '',
                                    images: Array.isArray(l.images) ? l.images : (l.image ? [l.image] : []),
                                    videos: Array.isArray(l.videos) ? l.videos : []
                                  });
                                  setCitySearchAd(l.location ? l.location.split(' - ')[0] : '');
                                  setShowAdModal(true);
                                }}
                                className="p-2 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-lg transition-all cursor-pointer"
                                title="Editar Anúncio"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteListing(l.id)}
                                className="p-2 text-[#DC3545] hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Excluir Anúncio"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#F8F9FA]">
                  <span className="text-xs text-[#999] font-medium">Página {listingsPage}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setListingsPage(prev => Math.max(1, prev - 1))}
                      disabled={listingsPage === 1}
                      className="p-2 bg-[#F8F9FA] text-[#666] rounded-lg hover:bg-[#E9ECEF] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setListingsPage(prev => prev + 1)}
                      disabled={!hasMoreListings}
                      className="p-2 bg-[#F8F9FA] text-[#666] rounded-lg hover:bg-[#E9ECEF] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

              </div>
            ) : adminTab === 'auctions' ? (
              <AdminAuctionManager />
            ) : adminTab === 'system' ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <HardDrive size={20} className="text-[#2D5A27]" />
                  <h3 className="text-lg font-bold text-[#333]">Sistema e Manutenção</h3>
                </div>
                
                <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-[#E9ECEF] mb-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                      <h4 className="font-bold text-[#333] text-lg mb-2">Limpeza de Storage</h4>
                      <p className="text-sm text-[#666] max-w-xl">
                        Este processo varre o banco de dados em busca de imagens e vídeos órfãos (arquivos que estão no Supabase Storage mas não estão mais vinculados a nenhum anúncio ativo) e os remove permanentemente para liberar espaço.
                      </p>
                    </div>
                    <button
                      onClick={handleStorageCleanup}
                      disabled={isCleaningStorage}
                      className={`shrink-0 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 min-w-[200px] ${
                        isCleaningStorage 
                          ? 'bg-[#E9ECEF] text-[#999] cursor-not-allowed'
                          : 'bg-[#DC3545] text-white hover:bg-[#C82333] shadow-md shadow-red-500/20 cursor-pointer'
                      }`}
                    >
                      {isCleaningStorage ? (
                        <>
                          <Spinner size="sm" className="border-gray-300 border-t-gray-500" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Trash2 size={18} />
                          Limpar Mídias Órfãs
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-[#E9ECEF] shadow-sm">
                   <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                    <div>
                      <h4 className="font-bold text-[#333] text-lg mb-1">Boletim Semanal de Preços</h4>
                      <p className="text-sm text-[#666]">
                        Sincronize indicadores do CEPEA, B3 e Scot Consultoria automaticamente.
                      </p>
                      {marketData?.timestamp && (
                        <p className="text-[10px] text-[#2D5A27] font-bold mt-2 uppercase">
                          Última Sincronização: {new Date(marketData.timestamp).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSyncMarket}
                      disabled={isSyncingMarket}
                      className={`shrink-0 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 min-w-[200px] ${
                        isSyncingMarket 
                          ? 'bg-[#F1F3F5] text-[#999] cursor-not-allowed'
                          : 'bg-[#2D5A27] text-white hover:bg-[#23461E] shadow-lg shadow-[#2D5A27]/20 cursor-pointer'
                      }`}
                    >
                      {isSyncingMarket ? (
                        <>
                          <Spinner size="sm" className="border-gray-300 border-t-gray-500" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <LayoutGrid size={18} />
                          Sincronizar Agora
                        </>
                      )}
                    </button>
                  </div>

                  {marketData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                         <span className="text-[10px] font-bold text-[#999] uppercase">CEPEA (Boi Gordo)</span>
                         <div className="text-xl font-bold text-[#333] mt-1">
                           R$ {marketData.cepea?.price?.toFixed(2) || '---'}
                         </div>
                         <div className={`text-[11px] font-bold mt-1 ${marketData.cepea?.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                           {marketData.cepea?.delta > 0 ? '+' : ''}{marketData.cepea?.delta}% {marketData.cepea?.trend === 'up' ? '↑' : '↓'}
                         </div>
                      </div>
                      
                      <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                         <span className="text-[10px] font-bold text-[#999] uppercase">Scot (Pelotas)</span>
                         <div className="text-xl font-bold text-[#333] mt-1">
                           R$ {marketData.scot?.pelotas?.[0]?.price?.toFixed(2) || '---'}
                         </div>
                         <span className="text-[10px] text-[#666]">R$/kg vivo</span>
                      </div>

                      <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                         <span className="text-[10px] font-bold text-[#999] uppercase">B3 Futuro (Próximo)</span>
                         <div className="text-xl font-bold text-[#333] mt-1">
                           R$ {marketData.b3?.[0]?.price?.toFixed(2) || '---'}
                         </div>
                         <span className="text-[10px] text-[#666]">{marketData.b3?.[0]?.month || '---'}</span>
                       </div>
                    </div>
                  )}

                  {/* AI Summary Editor */}
                  <div className="mt-8 pt-6 border-t border-[#E9ECEF] space-y-4">
                    <div>
                      <h5 className="font-bold text-[#333] text-sm mb-1">Resumo Executivo Gerado pela IA</h5>
                      <p className="text-xs text-[#999] mb-3">Você pode revisar e alterar o resumo que será exibido aos usuários do portal.</p>
                      <textarea
                        value={editedSummary}
                        onChange={(e) => setEditedSummary(e.target.value)}
                        rows={5}
                        placeholder="Nenhum resumo gerado ou disponível."
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-[#2D5A27] transition-all"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveSummary}
                        disabled={isSavingSummary}
                        className="px-6 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSavingSummary ? (
                          <>
                            <Spinner size="sm" variant="white" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Resumo Editado'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI Prompt Settings Editor */}
                  <div className="mt-8 pt-6 border-t border-[#E9ECEF] space-y-4">
                    <div>
                      <h5 className="font-bold text-[#333] text-sm mb-1">Diretrizes do Prompt da IA (Gemini 3.5 Flash)</h5>
                      <p className="text-xs text-[#999] mb-3">Defina as instruções de sistema que guiarão o analista de IA a redigir o resumo executivo.</p>
                      <textarea
                        value={promptConfig}
                        onChange={(e) => setPromptConfig(e.target.value)}
                        rows={6}
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-xs outline-none focus:bg-white focus:border-[#2D5A27] font-mono transition-all"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSavePrompt}
                        disabled={isSavingPrompt}
                        className="px-6 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSavingPrompt ? (
                          <>
                            <Spinner size="sm" variant="white" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Diretrizes de Prompt'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : adminTab === 'suggestions' ? (
              <AdminCalculatorSuggestions />
            ) : adminTab === 'ocr-audit' ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <ShieldCheck className="text-[#2D5A27]" size={20} />
                  <h3 className="text-lg font-bold text-[#333]">Auditoria de Lotes Rejeitados (OCR)</h3>
                </div>

                {loadingOcrAudit ? (
                  <div className="py-20 text-center">
                    <Loader2 className="animate-spin text-[#2D5A27] mx-auto mb-4" size={40} />
                    <p className="text-sm text-[#666]">Carregando logs de auditoria do OCR...</p>
                  </div>
                ) : ocrAuditRecords && ocrAuditRecords.length > 0 ? (
                  <div className="space-y-8">
                    {ocrAuditRecords.map((audit: any) => (
                      <div key={audit.folder} className="bg-white rounded-2xl border border-[#E9ECEF] overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#F8F9FA] border-b border-[#E9ECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-[#999] uppercase">Praça: {audit.plaza}</span>
                            <h4 className="font-bold text-[#333] text-sm mt-0.5">Leilão #{audit.auctionId} ({audit.date})</h4>
                          </div>
                          <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                            {audit.items?.length || 0} Lotes Rejeitados
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-[#F8F9FA] text-[10px] uppercase tracking-widest text-[#999] font-bold border-b border-[#E9ECEF]">
                                <th className="px-4 py-3">Lote</th>
                                <th className="px-4 py-3">Texto Original OCR</th>
                                <th className="px-4 py-3 text-center">Qtd</th>
                                <th className="px-4 py-3 text-center">Peso Méd. (Kg)</th>
                                <th className="px-4 py-3 text-center">Preço (R$)</th>
                                <th className="px-4 py-3 text-center">Média/Kg</th>
                                <th className="px-4 py-3">Motivo da Rejeição</th>
                              </tr>
                            </thead>
                            <tbody>
                              {audit.items?.map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-[#F8F9FA] hover:bg-[#F8F9FA]/50 transition-colors">
                                  <td className="px-4 py-3 font-bold text-[#333]">#{item.Lote || 'N/A'}</td>
                                  <td className="px-4 py-3 font-medium text-[#666] font-mono max-w-[200px] truncate" title={item.Animal}>
                                    {item.Animal}
                                  </td>
                                  <td className="px-4 py-3 text-center text-[#666]">{item.Qtd || item.Quantidade || '---'}</td>
                                  <td className="px-4 py-3 text-center text-[#666]">{item.Peso || '---'} Kg</td>
                                  <td className="px-4 py-3 text-center text-[#666]">R$ {item.Preço || '---'}</td>
                                  <td className="px-4 py-3 text-center text-[#666]">R$ {item.Média || '---'}</td>
                                  <td className="px-4 py-3 text-red-600 font-medium max-w-[250px] break-words">
                                    {item._audit_reason || 'Inconsistência de Peso/Preço/Média'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-[#F8F9FA] rounded-3xl border border-dashed border-[#E9ECEF]">
                    <ShieldCheck size={48} className="text-[#999] mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-bold text-[#333]">Nenhum lote inconsistente encontrado</p>
                    <p className="text-sm text-[#666]">Os logs de lotes rejeitados pelo processador OCR serão listados aqui.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowUserModal(false); setEditingUser(null); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-[#333]">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h2>
                  <button onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="text-[#999] hover:text-[#333] cursor-pointer">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={editingUser ? handleUpdateUser : handleAdminCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      placeholder="Nome do usuário"
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={authForm.phone}
                      onChange={(e) => setAuthForm({ ...authForm, phone: formatPhone(e.target.value) })}
                      placeholder="(00) 0000 00000"
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={citySearchAuth}
                      onChange={(e) => {
                        setCitySearchAuth(e.target.value);
                        setAuthForm({ ...authForm, city: e.target.value });
                        setShowAuthSuggestions(true);
                      }}
                      onFocus={() => setShowAuthSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowAuthSuggestions(false), 200)}
                      placeholder="Busque o município..."
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                    {citySuggestionsAuth.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                        {citySuggestionsAuth.map((city: any) => (
                          <button
                            key={city.name}
                            type="button"
                            onMouseDown={() => {
                              setAuthForm({ ...authForm, city: city.name });
                              setCitySearchAuth(city.name);
                              setShowAuthSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span>{city.name}</span>
                            <span className="text-[10px] text-[#999]">RS</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {!editingUser && (
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                        Senha
                      </label>
                      <input
                        type="password"
                        required
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#2D5A27] text-white rounded-2xl font-bold hover:bg-[#1E3D1A] transition-all shadow-lg shadow-[#2D5A27]/20 cursor-pointer mt-4"
                  >
                    {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAdModal(false); setEditingListingId(null); setMediaToDelete([]); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col"
            >
              {(isUpdatingListing || isUploadingMedia) && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Spinner size="xl" className="mb-4" />
                  <h3 className="text-lg font-bold text-[#2D5A27] animate-pulse">
                    {isUploadingMedia ? 'Enviando mídias...' : 'Salvando alterações...'}
                  </h3>
                  <p className="text-sm text-[#666] mt-2">
                    {isUploadingMedia ? 'Aguarde o carregamento das suas fotos e vídeos.' : 'Atualizando dados e imagens, por favor aguarde.'}
                  </p>
                </div>
              )}
              <div className="p-8 border-b border-[#E9ECEF] flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#333]">Editar Anúncio</h2>
                <button onClick={() => { setShowAdModal(false); setEditingListingId(null); }} className="text-[#999] hover:text-[#333] cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                <form onSubmit={handleUpdateListing} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Título do Anúncio</label>
                    <input
                      type="text"
                      required
                      value={adForm.title}
                      onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Categoria</label>
                      <select
                        required
                        value={CATEGORIES_LIST.find(c => c.toLowerCase() === adForm.category.toLowerCase()) || adForm.category}
                        onChange={(e) => setAdForm({ ...adForm, category: e.target.value })}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none"
                      >
                        <option value="" disabled>Selecione uma categoria...</option>
                        {CATEGORIES_LIST.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Quantidade (Animais)</label>
                      <input
                        type="number"
                        required min="1"
                        value={adForm.quantity}
                        onChange={(e) => setAdForm({ ...adForm, quantity: Number(e.target.value) })}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Preço por Kg (R$)</label>
                      <input
                        type="number"
                        step="0.01" required
                        value={adForm.priceKg}
                        onChange={(e) => setAdForm({ ...adForm, priceKg: Number(e.target.value) })}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Peso Médio (Kg)</label>
                      <input
                        type="number"
                        step="0.1" required
                        value={adForm.avgWeight}
                        onChange={(e) => setAdForm({ ...adForm, avgWeight: Number(e.target.value) })}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Preço Total (R$)</label>
                      <input
                        type="text"
                        readOnly
                        value={totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        className="w-full bg-[#E9F0E8] text-[#2D5A27] font-bold border border-transparent rounded-xl px-4 py-3 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Localização (Município RS)</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={citySearchAd}
                        onChange={(e) => {
                          setCitySearchAd(e.target.value);
                          setAdForm({ ...adForm, location: e.target.value });
                          setShowAdSuggestions(true);
                        }}
                        onFocus={() => setShowAdSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowAdSuggestions(false), 200)}
                        placeholder="Nome da cidade..."
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                      {citySuggestionsAd.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                          {citySuggestionsAd.map((city: any) => (
                            <button
                              key={city.name}
                              type="button"
                              onClick={() => {
                                const newLocation = `${city.name.toUpperCase()} - RS`;
                                setAdForm({ ...adForm, location: newLocation });
                                setCitySearchAd(city.name.toUpperCase());
                                setShowAdSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span>{city.name}</span>
                              <span className="text-[10px] text-[#999]">RS</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Descrição</label>
                    <textarea
                      required rows={4}
                      value={adForm.description}
                      onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-4 border-t border-[#E9ECEF] pt-4 mt-4">
                    <label className="block text-sm font-bold text-[#333] mb-2">Fotos e Vídeos</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={(e) => handleFileChange(e, 'images')}
                        multiple
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingMedia}
                      />
                      <button
                        type="button"
                        disabled={isUploadingMedia}
                        onClick={() => imageInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl transition-all ${isUploadingMedia ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#2D5A27] hover:bg-[#F8F9FA] cursor-pointer text-[#999] hover:text-[#2D5A27]'}`}
                      >
                        {isUploadingMedia ? <Spinner size="sm" variant="default" /> : <Camera size={24} />}
                        <span className="text-[10px] font-bold uppercase">{isUploadingMedia ? 'Enviando...' : 'Adicionar Fotos'}</span>
                      </button>

                      <input
                        type="file"
                        ref={videoInputRef}
                        onChange={(e) => handleFileChange(e, 'videos')}
                        multiple
                        accept="video/*"
                        className="hidden"
                        disabled={isUploadingMedia}
                      />
                      <button
                        type="button"
                        disabled={isUploadingMedia}
                        onClick={() => videoInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl transition-all ${isUploadingMedia ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#2D5A27] hover:bg-[#F8F9FA] cursor-pointer text-[#999] hover:text-[#2D5A27]'}`}
                      >
                        {isUploadingMedia ? <Spinner size="sm" variant="default" /> : <Video size={24} />}
                        <span className="text-[10px] font-bold uppercase">{isUploadingMedia ? 'Enviando...' : 'Adicionar Vídeos'}</span>
                      </button>
                    </div>

                    {(adForm.images.length > 0 || adForm.videos.length > 0) && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                        {adForm.images.map((img, idx) => (
                          <div key={`img-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group border border-[#E9ECEF]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" className="w-full h-full object-cover" />

                            {/* Reorder Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {idx > 0 && (
                                <button type="button" onClick={() => moveImage(idx, 'left')} className="p-1.5 bg-white text-[#333] rounded-full hover:bg-[#F8F9FA] transition-colors shadow">
                                  <ChevronLeft size={16} />
                                </button>
                              )}
                              {idx < adForm.images.length - 1 && (
                                <button type="button" onClick={() => moveImage(idx, 'right')} className="p-1.5 bg-white text-[#333] rounded-full hover:bg-[#F8F9FA] transition-colors shadow">
                                  <ChevronRight size={16} />
                                </button>
                              )}
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => removeFile(idx, 'images')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 shadow-md"
                            >
                              <X size={12} />
                            </button>

                            {/* Capa Badge */}
                            {idx === 0 && (
                              <div className="absolute top-1 left-1 bg-[#2D5A27] text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full z-10 shadow-md">
                                Capa
                              </div>
                            )}
                          </div>
                        ))}
                        {adForm.videos.map((vid, idx) => (
                          <div key={`vid-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group bg-black flex items-center justify-center border border-[#E9ECEF]">
                            <Video size={20} className="text-white" />
                            <button
                              type="button"
                              onClick={() => removeFile(idx, 'videos')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#2D5A27] text-white rounded-2xl font-bold hover:bg-[#1E3D1A] transition-all shadow-lg shadow-[#2D5A27]/20 cursor-pointer mt-4"
                  >
                    Salvar Alterações
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {user && (
        <BottomNav
          user={user}
          onAdClick={() => router.push('/?ad=new')}
          onAuthClick={() => router.push('/?auth=login')}
        />
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

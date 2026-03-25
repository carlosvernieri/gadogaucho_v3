'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmModal, showToast } from '@/components/ConfirmModal';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify } from '@/lib/utils';
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
  Search,
  Megaphone,
  Heart,
  Loader2,
  Camera,
  Video
} from 'lucide-react';
import Image from 'next/image';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';

export default function AdminPage() {
  const router = useRouter();
  const { user, setUser, logout } = useUser();
  const [loading, setLoading] = useState(true);
  const [adminTab, setAdminTab] = useState<'users' | 'listings' | 'verifications'>('users');
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', city: '', password: '' });
  const [citySearchAuth, setCitySearchAuth] = useState('');
  const [showAuthSuggestions, setShowAuthSuggestions] = useState(false);
  const [citySuggestionsAuth, setCitySuggestionsAuth] = useState<any[]>([]);

  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
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
    onConfirm: () => {}
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const storedUser = localStorage.getItem('gado_gaucho_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser.is_admin) {
          router.push('/');
          return;
        }
        setUser(parsedUser);
        await fetchData();
      } else {
        router.push('/');
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, listingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/listings')
      ]);
      
      if (usersRes.ok) {
        const users = await usersRes.json();
        setAllUsers(users);
      }
      
      if (listingsRes.ok) {
        const allListings = await listingsRes.json();
        setListings(allListings);
        setVerificationRequests(allListings.filter((l: any) => l.verification_requested && !l.verified));
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  const handleEditUser = (u: any) => {
    setEditingUser(u);
    setAuthForm({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
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

  const handleToggleListingVerified = async (l: any) => {
    try {
      const res = await fetch(`/api/listings/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ verified: !l.verified, verification_requested: false })
      });
      if (res.ok) {
        setListings(listings.map(listing => listing.id === l.id ? { ...listing, verified: !l.verified, verification_requested: false } : listing));
        showToast(`Anúncio ${!l.verified ? 'verificado' : 'desverificado'} com sucesso!`, 'success');
      }
    } catch (error) {
      console.error('Error toggling listing verification:', error);
    }
  };

  const [adForm, setAdForm] = useState({
    category: 'Touro',
    weight: 0,
    priceKg: 0,
    batchSize: 1,
    city: '',
    description: '',
    images: [] as string[],
    videos: [] as string[]
  });

  const [citySearchAd, setCitySearchAd] = useState('');
  const [showAdSuggestions, setShowAdSuggestions] = useState(false);
  const citySuggestionsAd = React.useMemo(() => {
    if (citySearchAd.length > 1 && showAdSuggestions) {
      return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAd.toLowerCase()));
    }
    return [];
  }, [citySearchAd, showAdSuggestions]);

  const handleEditListing = (listing: any) => {
    setEditingListingId(listing.id);
    setAdForm({
      category: listing.category,
      weight: listing.avgWeight,
      priceKg: listing.priceKg,
      batchSize: listing.quantity,
      city: listing.location.split(' - ')[0],
      description: listing.description || '',
      images: Array.isArray(listing.images) ? listing.images : [listing.image],
      videos: Array.isArray(listing.videos) ? listing.videos : []
    });
    setCitySearchAd(listing.location.split(' - ')[0]);
    setShowAdModal(true);
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cityData = RS_CITIES.find(c => c.name.toLowerCase() === adForm.city.toLowerCase());
      const res = await fetch(`/api/listings/${editingListingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({
          category: adForm.category,
          avgWeight: adForm.weight,
          priceKg: adForm.priceKg,
          quantity: adForm.batchSize,
          location: `${adForm.city.toUpperCase()} - RS`,
          lat: cityData?.lat || null,
          lng: cityData?.lng || null,
          description: adForm.description,
          images: adForm.images,
          videos: adForm.videos,
          price: adForm.weight * adForm.priceKg
        })
      });
      if (res.ok) {
        setShowAdModal(false);
        setEditingListingId(null);
        fetchData();
        showToast('Anúncio atualizado com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
    }
  };

  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push(base64);
    }

    setAdForm(prev => ({
      ...prev,
      [type]: [...prev[type], ...newFiles]
    }));
    e.target.value = '';
  };

  const removeFile = (index: number, type: 'images' | 'videos') => {
    setAdForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
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
        }
      }
    });
  };

  if (loading) {
    return <LoadingScreen message="Acessando painel administrativo..." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] pb-20 lg:pb-0">
      <Header 
        user={user}
        onMenuClick={() => {}}
        onAuthClick={() => {}}
        onAdClick={() => {}}
        onAdminClick={() => {}}
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
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <LayoutGrid size={20} className="text-[#2D5A27]" />
                  <h3 className="text-lg font-bold text-[#333]">Gerenciar Todos os Anúncios</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E9ECEF] text-[#999] font-bold text-[10px] uppercase tracking-wider">
                        <th className="pb-4 px-4">Cód</th>
                        <th className="pb-4 px-4">Título</th>
                        <th className="pb-4 px-4">Vendedor</th>
                        <th className="pb-4 px-4">Status</th>
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
                                onClick={() => handleEditListing(l)}
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
              </div>
            )}
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
                      onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
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
                      onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
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
                      onChange={(e) => setAuthForm({...authForm, phone: e.target.value})}
                      placeholder="(00) 00000-0000" 
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
                        setAuthForm({...authForm, city: e.target.value});
                        setShowAuthSuggestions(true);
                      }}
                      placeholder="Cidade no RS" 
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                    />
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
                        onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
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

        {showAdModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAdModal(false); setEditingListingId(null); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-[#333]">Editar Anúncio</h2>
                  <button onClick={() => { setShowAdModal(false); setEditingListingId(null); }} className="text-[#999] hover:text-[#333] cursor-pointer">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSaveListing} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Categoria</label>
                      <select 
                        value={adForm.category}
                        onChange={(e) => setAdForm({...adForm, category: e.target.value})}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none"
                      >
                        {CATEGORIES_LIST.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Município (RS)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          value={citySearchAd}
                          onChange={(e) => {
                            setCitySearchAd(e.target.value);
                            setAdForm({...adForm, city: e.target.value});
                            setShowAdSuggestions(true);
                          }}
                          onFocus={() => setShowAdSuggestions(true)}
                          placeholder="Busque o município..." 
                          className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                        />
                        {citySuggestionsAd.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-10 overflow-hidden">
                            {citySuggestionsAd.map((city: any) => (
                              <button 
                                key={city.name}
                                type="button"
                                onClick={() => {
                                  setAdForm({...adForm, city: city.name});
                                  setCitySearchAd(city.name);
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Peso Médio (kg)</label>
                      <input 
                        type="number" 
                        required
                        value={adForm.weight || ''}
                        onChange={(e) => setAdForm({...adForm, weight: Number(e.target.value)})}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Preço por kg (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={adForm.priceKg || ''}
                        onChange={(e) => setAdForm({...adForm, priceKg: Number(e.target.value)})}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Quantidade</label>
                      <input 
                        type="number" 
                        required
                        value={adForm.batchSize || ''}
                        onChange={(e) => setAdForm({...adForm, batchSize: Number(e.target.value)})}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Descrição Detalhada</label>
                    <textarea 
                      rows={4}
                      value={adForm.description}
                      onChange={(e) => setAdForm({...adForm, description: e.target.value})}
                      placeholder="Fale mais sobre o lote, genética, vacinação, etc."
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-[#999] uppercase ml-2">Fotos do Lote</label>
                      <button 
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="text-[10px] font-bold text-[#2D5A27] flex items-center gap-1 hover:underline"
                      >
                        <Plus size={12} /> Adicionar Fotos
                      </button>
                      <input 
                        type="file" 
                        ref={imageInputRef}
                        onChange={(e) => handleFileChange(e, 'images')}
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {adForm.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-[#E9ECEF]">
                          <Image src={img} alt="Preview" fill className="object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => removeFile(idx, 'images')}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-[#E9ECEF] flex items-center justify-center text-[#999] hover:border-[#2D5A27] hover:text-[#2D5A27] transition-all"
                      >
                        <Camera size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-[#999] uppercase ml-2">Vídeos (Opcional)</label>
                      <button 
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="text-[10px] font-bold text-[#2D5A27] flex items-center gap-1 hover:underline"
                      >
                        <Plus size={12} /> Adicionar Vídeos
                      </button>
                      <input 
                        type="file" 
                        ref={videoInputRef}
                        onChange={(e) => handleFileChange(e, 'videos')}
                        multiple 
                        accept="video/*" 
                        className="hidden" 
                      />
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {adForm.videos.map((vid, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-[#E9ECEF] bg-black flex items-center justify-center">
                          <Video size={20} className="text-white" />
                          <button 
                            type="button"
                            onClick={() => removeFile(idx, 'videos')}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-[#E9ECEF] flex items-center justify-center text-[#999] hover:border-[#2D5A27] hover:text-[#2D5A27] transition-all"
                      >
                        <Video size={20} />
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#2D5A27] text-white rounded-2xl font-bold hover:bg-[#1E3D1A] transition-all shadow-lg shadow-[#2D5A27]/20 cursor-pointer"
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

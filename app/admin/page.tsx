'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmModal, showToast } from '@/components/ConfirmModal';
import { useUser } from '@/context/UserContext';
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
  Loader2
} from 'lucide-react';
import Image from 'next/image';

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
        body: JSON.stringify({ verified: !u.verified })
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
        body: JSON.stringify({
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
        body: JSON.stringify(authForm)
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
        body: JSON.stringify({ verified: true, verification_requested: false })
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
        body: JSON.stringify({ verification_requested: false })
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
                                onClick={() => {
                                  setEditingListingId(l.id);
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

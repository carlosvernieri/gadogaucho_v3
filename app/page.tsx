'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { 
  Search, 
  MapPin, 
  LayoutGrid, 
  Heart, 
  Share2, 
  ChevronLeft, 
  Bell, 
  User, 
  LogOut, 
  ShieldCheck,
  MessageSquare,
  Star,
  Menu,
  X,
  Plus,
  Camera,
  Video,
  ChevronRight,
  Check,
  Megaphone,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RS_CITIES, CATEGORIES_LIST, INITIAL_LISTINGS } from '@/lib/data';
import { slugify } from '@/lib/utils';
import { Badge } from '@/components/Badge';
import { ListingCard } from '@/components/ListingCard';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { isSupabaseConfigured } from '@/lib/supabase';

// --- Main App ---

function GadoGauchoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Proximity Search State
  const [citySearch, setCitySearch] = useState('');
  const [maxDistance, setMaxDistance] = useState(100);
  const [selectedCityCoords, setSelectedCityCoords] = useState<{lat: number, lng: number} | null>(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Haversine formula to calculate distance between two points in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const citySuggestions = useMemo(() => {
    if (citySearch.length > 1 && showCitySuggestions) {
      return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()));
    }
    return [];
  }, [citySearch, showCitySuggestions]);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setSelectedCityCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setCitySearch('Minha Localização');
        setShowCitySuggestions(false);
      }, (error) => {
        console.error('Error getting location:', error);
        alert('Não foi possível obter sua localização. Verifique as permissões do navegador.');
      });
    } else {
      alert('Geolocalização não é suportada pelo seu navegador.');
    }
  };
  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // File Upload Refs
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Basic size check (e.g., 5MB for images, 20MB for videos)
      if (type === 'images' && file.size > 5 * 1024 * 1024) {
        alert(`A imagem ${file.name} é muito grande. Máximo 5MB.`);
        continue;
      }
      if (type === 'videos' && file.size > 20 * 1024 * 1024) {
        alert(`O vídeo ${file.name} é muito grande. Máximo 20MB.`);
        continue;
      }

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
    
    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const removeFile = (index: number, type: 'images' | 'videos') => {
    setAdForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase is not configured. Using initial data.');
        setListings((INITIAL_LISTINGS as any[]).map((l, i) => ({ ...l, id: i + 1 })));
        setLoading(false);
        return;
      }

      try {
        const [listingsRes, usersRes] = await Promise.all([
          fetch('/api/listings'),
          fetch('/api/users')
        ]);

        if (!listingsRes.ok || !usersRes.ok) {
          const lErr = !listingsRes.ok ? await listingsRes.json().catch(() => ({ error: 'Failed to parse listings error' })) : {};
          const uErr = !usersRes.ok ? await usersRes.json().catch(() => ({ error: 'Failed to parse users error' })) : {};
          console.error('API Error Details:', { listings: lErr, users: uErr });
          throw new Error(`Failed to fetch data: ${lErr.error || uErr.error || 'Unknown error'}`);
        }

        const listingsData = await listingsRes.json();
        const usersData = await usersRes.json();
        
        if (Array.isArray(listingsData)) {
          setListings(listingsData);
        }
        if (Array.isArray(usersData)) {
          setAllUsers(usersData);
        }
        
        // Check local storage for session
        const storedUser = localStorage.getItem('gado_gaucho_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Re-verify with allUsers to get latest data
          const found = Array.isArray(usersData) ? usersData.find((u: any) => u.email === parsedUser.email) : null;
          if (found) setUser(found);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error.message || error);
        // Fallback to initial data on error
        setListings((INITIAL_LISTINGS as any[]).map((l, i) => ({ ...l, id: i + 1 })));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle category from query params
  useEffect(() => {
    const catParam = searchParams.get('category');
    setSelectedCategory(catParam);
  }, [searchParams]);

  // Auth Form State
  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    password: ''
  });

  // Ad Form State
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
  const [citySearchAuth, setCitySearchAuth] = useState('');
  const [showAdSuggestions, setShowAdSuggestions] = useState(false);
  const [showAuthSuggestions, setShowAuthSuggestions] = useState(false);

  const citySuggestionsAd = useMemo(() => {
    if (citySearchAd.length > 1 && showAdSuggestions) {
      return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAd.toLowerCase()));
    }
    return [];
  }, [citySearchAd, showAdSuggestions]);

  const citySuggestionsAuth = useMemo(() => {
    if (citySearchAuth.length > 1 && showAuthSuggestions) {
      return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAuth.toLowerCase()));
    }
    return [];
  }, [citySearchAuth, showAuthSuggestions]);

  const totalPrice = useMemo(() => {
    return adForm.weight * adForm.priceKg;
  }, [adForm.weight, adForm.priceKg]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authMode === 'register') {
      const newUser = { 
        ...authForm, 
        is_admin: authForm.email === 'adriano.prog@gmail.com' 
      };
      
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        if (res.ok) {
          const savedUser = await res.json();
          setUser(savedUser);
          setAllUsers([...allUsers, savedUser]);
          localStorage.setItem('gado_gaucho_user', JSON.stringify(savedUser));
          setShowAuthModal(false);
        } else {
          const error = await res.json();
          setAuthError(error.error || 'Erro ao cadastrar');
          return;
        }
      } catch (error) {
        console.error('Error registering:', error);
        setAuthError('Erro ao conectar ao servidor');
        return;
      }
    } else {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password
          })
        });

        if (res.ok) {
          const foundUser = await res.json();
          setUser(foundUser);
          localStorage.setItem('gado_gaucho_user', JSON.stringify(foundUser));
          setShowAuthModal(false);
        } else {
          const error = await res.json();
          setAuthError(error.error || 'Erro ao fazer login');
          return;
        }
      } catch (error) {
        console.error('Error logging in:', error);
        setAuthError('Erro ao conectar ao servidor');
        return;
      }
    }
  };

  const handleDeleteListing = async (id: number) => {
    try {
      await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      setListings(listings.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting listing:', error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      setAllUsers(allUsers.filter(u => u.id !== id));
      if (user?.id === id) {
        setUser(null);
        localStorage.removeItem('gado_gaucho_user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleShare = (id: number) => {
    const url = `${window.location.origin}/listing/${id}`;
    navigator.clipboard.writeText(url);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find coordinates for the selected city
    const cityData = RS_CITIES.find(c => c.name.toLowerCase() === adForm.city.toLowerCase());
    
    const newAd = {
      category: adForm.category.toUpperCase(),
      title: `${adForm.category} em ${adForm.city}`,
      price: totalPrice,
      priceKg: adForm.priceKg,
      avgWeight: adForm.weight,
      quantity: adForm.batchSize,
      location: `${adForm.city.toUpperCase()} - RS`,
      lat: cityData?.lat || null,
      lng: cityData?.lng || null,
      seller: user?.name || 'Vendedor',
      image: adForm.images[0] || 'https://picsum.photos/seed/newcattle/800/600',
      description: adForm.description,
      images: adForm.images.length > 0 ? adForm.images : ['https://picsum.photos/seed/newcattle/800/600'],
      videos: adForm.videos
    };

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAd)
      });
      const savedAd = await res.json();
      setListings([savedAd, ...listings]);
      setShowAdModal(false);
      setCitySearchAd('');
      setAdForm({
        category: 'Touro',
        weight: 0,
        priceKg: 0,
        batchSize: 1,
        city: '',
        description: '',
        images: [],
        videos: []
      });
    } catch (error) {
      console.error('Error creating ad:', error);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      const matchesCategory = !selectedCategory || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.id.toString().includes(searchQuery);
      
      let matchesDistance = true;
      if (selectedCityCoords && item.lat && item.lng) {
        const distance = calculateDistance(
          selectedCityCoords.lat, 
          selectedCityCoords.lng, 
          item.lat, 
          item.lng
        );
        matchesDistance = distance <= maxDistance;
      }

      return matchesCategory && matchesSearch && matchesDistance;
    });
  }, [selectedCategory, searchQuery, listings, selectedCityCoords, maxDistance]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode); setShowAuthModal(true); setAuthError(null); }}
        onAdClick={() => setShowAdModal(true)}
        onAdminClick={() => setShowAdminPanel(true)}
        onLogout={() => { setUser(null); localStorage.removeItem('gado_gaucho_user'); }}
        onHomeClick={() => { setSelectedCategory(null); }}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full flex px-4 lg:px-8 py-8 gap-8 relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          listingsCount={listings.length}
          getCategoryCount={(catName) => listings.filter(l => l.category.toLowerCase() === catName.toLowerCase()).length}
          citySearch={citySearch}
          onCitySearchChange={(val) => {
            setCitySearch(val);
            setShowCitySuggestions(true);
            if (!val) setSelectedCityCoords(null);
          }}
          maxDistance={maxDistance}
          onMaxDistanceChange={setMaxDistance}
          onUseMyLocation={handleUseMyLocation}
          citySuggestions={citySuggestions}
          onSelectCity={(city) => {
            setCitySearch(city.name);
            setSelectedCityCoords({ lat: city.lat, lng: city.lng });
            setShowCitySuggestions(false);
          }}
          showSuggestions={showCitySuggestions}
          setShowSuggestions={setShowCitySuggestions}
        />

        {/* --- Main Content --- */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {showAdminPanel ? (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-sm"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-[#333]">Painel Administrativo</h2>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/test-supabase');
                          const data = await res.json();
                          if (data.status === 'success') {
                            alert('✅ ' + data.message);
                          } else {
                            alert('❌ ' + data.message + '\n\nDetalhes: ' + (data.details || 'Nenhum detalhe disponível'));
                          }
                        } catch (e) {
                          alert('❌ Erro ao tentar conectar com a API de teste.');
                        }
                      }}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
                    >
                      Testar Conexão
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/seed');
                          const data = await res.json();
                          alert(data.message || data.error);
                          window.location.reload();
                        } catch (e) {
                          alert('Erro ao popular banco de dados');
                        }
                      }}
                      className="px-4 py-2 bg-[#E9F0E8] text-[#2D5A27] rounded-lg text-xs font-bold hover:bg-[#D3E1D1] transition-all cursor-pointer"
                    >
                      Popular Banco de Dados
                    </button>
                    <button onClick={() => setShowAdminPanel(false)} className="text-[#666] hover:text-[#333] flex items-center gap-2 cursor-pointer">
                      <X size={20} /> Fechar
                    </button>
                  </div>
                </div>

                <div className="space-y-12">
                  {/* Gerenciar Usuários */}
                  <div>
                    <h3 className="text-lg font-bold text-[#333] mb-4 flex items-center gap-2">
                      <User size={20} className="text-[#2D5A27]" /> Gerenciar Usuários
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#E9ECEF] text-[#999] font-bold text-[10px] uppercase tracking-wider">
                            <th className="pb-4 px-4">Nome</th>
                            <th className="pb-4 px-4">E-mail</th>
                            <th className="pb-4 px-4">Cidade</th>
                            <th className="pb-4 px-4">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F8F9FA]">
                          {allUsers.map(u => (
                            <tr key={u.id} className="hover:bg-[#F8F9FA] transition-colors">
                              <td className="py-4 px-4 font-bold text-[#333]">{u.name} {u.is_admin && <span className="ml-2 text-[9px] bg-[#E9F0E8] text-[#2D5A27] px-1.5 py-0.5 rounded">ADMIN</span>}</td>
                              <td className="py-4 px-4 text-[#666]">{u.email}</td>
                              <td className="py-4 px-4 text-[#666]">{u.city}</td>
                              <td className="py-4 px-4">
                                {!u.is_admin && (
                                  <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="text-[#DC3545] hover:underline font-bold text-xs cursor-pointer"
                                  >
                                    Excluir
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Gerenciar Anúncios */}
                  <div>
                    <h3 className="text-lg font-bold text-[#333] mb-4 flex items-center gap-2">
                      <LayoutGrid size={20} className="text-[#2D5A27]" /> Gerenciar Anúncios
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#E9ECEF] text-[#999] font-bold text-[10px] uppercase tracking-wider">
                            <th className="pb-4 px-4">Cód</th>
                            <th className="pb-4 px-4">Título</th>
                            <th className="pb-4 px-4">Vendedor</th>
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
                              <td className="py-4 px-4 text-[#2D5A27] font-bold">R$ {l.price.toLocaleString()}</td>
                              <td className="py-4 px-4">
                                <button 
                                  onClick={() => handleDeleteListing(l.id)}
                                  className="text-[#DC3545] hover:underline font-bold text-xs cursor-pointer"
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {loading ? (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={24} className="text-[#2D5A27] animate-pulse" />
                      </div>
                    </div>
                    <h3 className="mt-6 text-lg font-bold text-[#333] animate-pulse">Carregando anúncios...</h3>
                    <p className="text-sm text-[#999] mt-2">Buscando as melhores ofertas do RS</p>
                  </div>
                ) : filteredListings.length > 0 ? (
                  filteredListings.map(listing => (
                    <ListingCard 
                      key={listing.id} 
                      listing={listing} 
                    />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-4 text-[#999]">
                      <Search size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-[#333]">Nenhum anúncio encontrado</h3>
                    <p className="text-sm text-[#666]">Tente ajustar seus filtros de busca.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      
      {/* --- Modals --- */}
      
      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
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
                    {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
                  </h2>
                  <button onClick={() => setShowAuthModal(false)} className="text-[#999] hover:text-[#333] cursor-pointer">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  {authError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                      {authError}
                    </motion.div>
                  )}
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                          Nome Completo <span className="text-[#DC3545]">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={authForm.name}
                          onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                          placeholder="Como quer ser chamado?" 
                          className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                          Telefone <span className="text-[#DC3545]">*</span>
                        </label>
                        <input 
                          type="tel" 
                          required
                          value={authForm.phone}
                          onChange={(e) => setAuthForm({...authForm, phone: e.target.value})}
                          placeholder="(00) 00000-0000" 
                          className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
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
                            value={citySearchAuth}
                            onChange={(e) => {
                              setCitySearchAuth(e.target.value);
                              setAuthForm({...authForm, city: e.target.value});
                              setShowAuthSuggestions(true);
                            }}
                            onFocus={() => setShowAuthSuggestions(true)}
                            placeholder="Sua cidade no RS" 
                            className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                          />
                          {citySuggestionsAuth.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-10 overflow-hidden">
                              {citySuggestionsAuth.map((city: any) => (
                                <button 
                                  key={city.name}
                                  type="button"
                                  onClick={() => {
                                    setAuthForm({...authForm, city: city.name});
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
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      E-mail <span className="text-[#DC3545]">*</span>
                    </label>
                    <input 
                      type="email" 
                      required
                      value={authForm.email}
                      onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                      placeholder="seu@email.com" 
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Senha <span className="text-[#DC3545]">*</span>
                    </label>
                    <input 
                      type="password" 
                      required
                      value={authForm.password}
                      onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                      placeholder="••••••••" 
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                    />
                  </div>
                  
                  <button className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all mt-4 cursor-pointer">
                    {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
                  </button>
                </form>
                
                <div className="mt-8 text-center">
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError(null);
                    }}
                    className="text-sm text-[#666] hover:text-[#2D5A27] transition-colors cursor-pointer"
                  >
                    {authMode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ad Creation Modal */}
      <AnimatePresence>
        {showAdModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdModal(false)}
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
                  <h2 className="text-2xl font-bold text-[#333]">Novo Anúncio</h2>
                  <button onClick={() => setShowAdModal(false)} className="text-[#999] hover:text-[#333] cursor-pointer">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleCreateAd} className="space-y-6">
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
                        placeholder="0" 
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Valor por kg (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={adForm.priceKg || ''}
                        onChange={(e) => setAdForm({...adForm, priceKg: Number(e.target.value)})}
                        placeholder="0,00" 
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Valor Total (Calculado)</label>
                      <div className="w-full bg-[#E9F0E8] text-[#2D5A27] font-bold rounded-xl px-4 py-3 text-sm border border-transparent">
                        R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Tamanho do Lote (Animais)</label>
                    <input 
                      type="number" 
                      required
                      value={adForm.batchSize}
                      onChange={(e) => setAdForm({...adForm, batchSize: Number(e.target.value)})}
                      placeholder="1" 
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Descrição</label>
                    <textarea 
                      rows={3}
                      value={adForm.description}
                      onChange={(e) => setAdForm({...adForm, description: e.target.value})}
                      placeholder="Detalhes sobre o gado, genética, vacinação..." 
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none" 
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        onChange={(e) => handleFileChange(e, 'images')} 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <button 
                        type="button" 
                        onClick={() => imageInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl hover:border-[#2D5A27] hover:bg-[#F8F9FA] transition-all text-[#999] hover:text-[#2D5A27] cursor-pointer"
                      >
                        <Camera size={24} />
                        <span className="text-[10px] font-bold uppercase">Adicionar Fotos</span>
                      </button>

                      <input 
                        type="file" 
                        ref={videoInputRef} 
                        onChange={(e) => handleFileChange(e, 'videos')} 
                        multiple 
                        accept="video/*" 
                        className="hidden" 
                      />
                      <button 
                        type="button" 
                        onClick={() => videoInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl hover:border-[#2D5A27] hover:bg-[#F8F9FA] transition-all text-[#999] hover:text-[#2D5A27] cursor-pointer"
                      >
                        <Video size={24} />
                        <span className="text-[10px] font-bold uppercase">Adicionar Vídeos</span>
                      </button>
                    </div>

                    {/* Previews */}
                    {(adForm.images.length > 0 || adForm.videos.length > 0) && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                        {adForm.images.map((img, idx) => (
                          <div key={`img-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group">
                            <Image src={img} alt="" fill className="object-cover" unoptimized />
                            <button 
                              type="button"
                              onClick={() => removeFile(idx, 'images')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {adForm.videos.map((vid, idx) => (
                          <div key={`vid-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group bg-black flex items-center justify-center">
                            <Video size={20} className="text-white" />
                            <button 
                              type="button"
                              onClick={() => removeFile(idx, 'videos')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all mt-4 cursor-pointer">
                    Publicar Anúncio
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#333] text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2"
          >
            <Check size={18} className="text-[#28A745]" /> Link copiado para a área de transferência!
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default function GadoGauchoApp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin mb-4" />
          <p className="text-[#2D5A27] font-bold animate-pulse">Carregando Gado Gaúcho...</p>
        </div>
      </div>
    }>
      <GadoGauchoContent />
    </Suspense>
  );
}

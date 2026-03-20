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
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RS_CITIES, CATEGORIES_LIST, INITIAL_LISTINGS } from '@/lib/data';
import { slugify } from '@/lib/utils';
import { Badge } from '@/components/Badge';
import { ListingCard } from '@/components/ListingCard';
import { ListingListItem } from '@/components/ListingListItem';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ShareModal } from '@/components/ShareModal';
import { BottomNav } from '@/components/BottomNav';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';

// --- Main App ---

function GadoGauchoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, logout } = useUser();
  const [listings, setListings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
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
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMyAds, setShowMyAds] = useState(false);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [adminTab, setAdminTab] = useState<'users' | 'listings' | 'verifications'>('users');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedListingForShare, setSelectedListingForShare] = useState<any>(null);
  const [favoriteToastMessage, setFavoriteToastMessage] = useState('');

  // Handle URL parameters for modals
  useEffect(() => {
    const authParam = searchParams.get('auth');
    const adParam = searchParams.get('ad');

    if (authParam === 'login') {
      setAuthMode('login');
      setShowAuthModal(true);
    } else if (authParam === 'register') {
      setAuthMode('register');
      setShowAuthModal(true);
    }

    if (adParam === 'new') {
      setShowAdModal(true);
    }
  }, [searchParams]);

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
      try {
        const [listingsRes, usersRes] = await Promise.all([
          fetch('/api/listings').catch(err => {
            console.error('Listings fetch failed:', err);
            return { ok: false, json: async () => ({ error: 'Network error' }) } as Response;
          }),
          fetch('/api/users').catch(err => {
            console.error('Users fetch failed:', err);
            return { ok: false, json: async () => ({ error: 'Network error' }) } as Response;
          })
        ]);

        if (!listingsRes.ok || !usersRes.ok) {
          const lErr = listingsRes.ok ? {} : await listingsRes.json().catch(() => ({ error: 'Failed to parse listings error' }));
          const uErr = usersRes.ok ? {} : await usersRes.json().catch(() => ({ error: 'Failed to parse users error' }));
          console.error('API Error Details:', { listings: lErr, users: uErr });
          
          // Fallback to initial data if API fails
          setListings((INITIAL_LISTINGS as any[]).map((l, i) => ({ ...l, id: i + 1 })));
        } else {
          const listingsData = await listingsRes.json();
          const usersData = await usersRes.json();
          
          if (Array.isArray(listingsData)) {
            setListings(listingsData.length > 0 ? listingsData : (INITIAL_LISTINGS as any[]).map((l, i) => ({ ...l, id: i + 1 })));
          }
          if (Array.isArray(usersData)) {
            setAllUsers(usersData);
          }
          
          // Check local storage for session
          const storedUser = localStorage.getItem('gado_gaucho_user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const found = Array.isArray(usersData) ? usersData.find((u: any) => u.email === parsedUser.email) : null;
            if (found) {
              setUser(found);
              fetch(`/api/favorites?email=${encodeURIComponent(found.email)}`)
                .then(res => res.json())
                .then(data => {
                  if (Array.isArray(data)) setFavorites(data);
                })
                .catch(err => console.error('Error fetching favorites:', err));
            }
          }
        }
      } catch (error: any) {
        console.error('Error in fetchData:', error.message || error);
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
    const favParam = searchParams.get('favorites');
    setSelectedCategory(catParam);
    if (favParam === 'true') {
      setShowFavorites(true);
    }
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
          // Fetch favorites
          fetch(`/api/favorites?email=${encodeURIComponent(savedUser.email)}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) setFavorites(data);
            })
            .catch(err => console.error('Error fetching favorites:', err));
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
          // Fetch favorites
          fetch(`/api/favorites?email=${encodeURIComponent(foundUser.email)}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) setFavorites(data);
            })
            .catch(err => console.error('Error fetching favorites:', err));
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
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;
    try {
      await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      setListings(listings.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting listing:', error);
    }
  };

  const handleUpdateListing = async (id: number, data: any) => {
    setIsUpdatingListing(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setListings(listings.map(l => l.id === id ? updated : l));
        return updated;
      } else {
        const error = await res.json();
        let message = `Erro ao atualizar anúncio: ${error.error || 'Erro desconhecido'}`;
        if (error.code === 'PGRST204') {
          message += `\n\nErro de Banco de Dados: Coluna ausente no Supabase. Por favor, execute o seguinte SQL no seu Editor SQL do Supabase:\n\nALTER TABLE listings ADD COLUMN IF NOT EXISTS verification_requested BOOLEAN DEFAULT FALSE;`;
        } else {
          message += `\n\nDetalhes: ${error.details || JSON.stringify(error)}`;
        }
        alert(message);
      }
    } catch (error: any) {
      console.error('Error updating listing:', error);
      alert(`Erro de rede ao atualizar anúncio: ${error.message || error}`);
    } finally {
      setIsUpdatingListing(false);
    }
    return null;
  };

  const handleToggleSold = async (id: number, currentStatus: boolean) => {
    const updated = await handleUpdateListing(id, { sold: !currentStatus });
    if (updated) {
      alert(`Anúncio marcado como ${!currentStatus ? 'vendido' : 'disponível'}!`);
    }
  };

  const handleRequestVerification = async (id: number) => {
    const updated = await handleUpdateListing(id, { verification_requested: true });
    if (updated) {
      alert('Solicitação de verificação enviada com sucesso! O administrador irá analisar seu anúncio.');
    }
  };

  const handleApproveVerification = async (id: number) => {
    const updated = await handleUpdateListing(id, { verified: true, verification_requested: false });
    if (updated) {
      alert('Anúncio verificado com sucesso!');
    }
  };

  const handleRejectVerification = async (id: number) => {
    const updated = await handleUpdateListing(id, { verification_requested: false });
    if (updated) {
      alert('Solicitação de verificação removida.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
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

  const handleEditUser = (userToEdit: any) => {
    setEditingUser(userToEdit);
    setAuthForm({
      name: userToEdit.name || '',
      email: userToEdit.email || '',
      phone: userToEdit.phone || '',
      city: userToEdit.city || '',
      password: ''
    });
    setCitySearchAuth(userToEdit.city || '');
    setShowUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      if (res.ok) {
        const updated = await res.json();
        setAllUsers(allUsers.map(u => u.id === updated.id ? updated : u));
        if (user?.id === updated.id) {
          setUser(updated);
          localStorage.setItem('gado_gaucho_user', JSON.stringify(updated));
        }
        setShowUserModal(false);
        setEditingUser(null);
        alert('Usuário atualizado com sucesso!');
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao atualizar usuário');
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
        const newUser = await res.json();
        setAllUsers([...allUsers, newUser]);
        setShowUserModal(false);
        alert('Usuário cadastrado com sucesso!');
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao cadastrar usuário');
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleShare = (id: number) => {
    const listing = listings.find(l => l.id === id);
    if (listing) {
      setSelectedListingForShare(listing);
      setShowShareModal(true);
    }
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
        body: JSON.stringify({ email: user.email, listingId: listingIdNum })
      });

      if (res.ok) {
        if (isFavorite) {
          setFavorites(favorites.filter(id => Number(id) !== listingIdNum));
          setFavoriteToastMessage('Removido dos favoritos');
        } else {
          setFavorites([...favorites, listingIdNum]);
          setFavoriteToastMessage('Adicionado aos favoritos!');
        }
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    
    setIsSubmittingAd(true);
    
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
      userId: user?.id,
      image: adForm.images[0] || 'https://picsum.photos/seed/newcattle/800/600',
      description: adForm.description,
      images: adForm.images.length > 0 ? adForm.images : ['https://picsum.photos/seed/newcattle/800/600'],
      videos: adForm.videos,
      verified: false
    };

    try {
      const url = editingListingId ? `/api/listings/${editingListingId}` : '/api/listings';
      const method = editingListingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAd)
      });

      if (res.ok) {
        const savedAd = await res.json();
        if (editingListingId) {
          setListings(listings.map(l => l.id === editingListingId ? savedAd : l));
          alert('Anúncio atualizado com sucesso!');
        } else {
          setListings([savedAd, ...listings]);
          alert('Anúncio criado com sucesso!');
        }
        setShowAdModal(false);
        setEditingListingId(null);
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
      } else {
        const error = await res.json();
        alert(`Erro ao ${editingListingId ? 'atualizar' : 'criar'} anúncio: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${editingListingId ? 'updating' : 'creating'} ad:`, error);
      alert(`Erro ao ${editingListingId ? 'atualizar' : 'criar'} anúncio. Tente novamente.`);
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const handleEditListing = (listing: any) => {
    setEditingListingId(listing.id);
    setAdForm({
      category: listing.category,
      weight: listing.avgWeight,
      priceKg: listing.priceKg,
      batchSize: listing.quantity,
      city: listing.location.split(' - ')[0],
      description: listing.description || '',
      images: listing.images || [listing.image],
      videos: listing.videos || []
    });
    setCitySearchAd(listing.location.split(' - ')[0]);
    setShowAdModal(true);
  };

  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // My Ads and Favorites should show sold items
      if (showMyAds) {
        return item.seller === user?.name;
      }
      if (showFavorites) {
        return favorites.map(Number).includes(Number(item.id));
      }

      // Home screen search/filter logic
      // Exclude sold items from home screen
      if (item.sold) return false;

      const matchesCategory = !selectedCategory || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.id.toString().includes(searchQuery);
      
      const matchesVerified = !showVerifiedOnly || item.verified;
      
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

      return matchesCategory && matchesSearch && matchesDistance && matchesVerified;
    });
  }, [selectedCategory, searchQuery, listings, selectedCityCoords, maxDistance, showFavorites, showMyAds, favorites, user, showVerifiedOnly]);

  const verificationRequests = useMemo(() => {
    return listings.filter(l => l.verification_requested && !l.verified);
  }, [listings]);

  return (
    <div className="min-h-screen flex flex-col pb-20 lg:pb-0">
      <Header 
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode); setShowAuthModal(true); setAuthError(null); }}
        onAdClick={() => setShowAdModal(true)}
        onAdminClick={() => { setShowAdminPanel(true); setShowFavorites(false); setShowMyAds(false); }}
        onLogout={() => { logout(); setFavorites([]); setShowFavorites(false); setShowMyAds(false); }}
        onHomeClick={() => { setSelectedCategory(null); setShowFavorites(false); setShowMyAds(false); setShowAdminPanel(false); }}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full flex px-4 lg:px-8 py-8 gap-8 relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setShowFavorites(false);
            setShowMyAds(false);
            setShowAdminPanel(false);
            setIsSidebarOpen(false);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => {
            const id = parseInt(searchQuery);
            if (!isNaN(id)) {
              const exists = listings.find(l => l.id === id);
              if (exists) {
                router.push(`/anuncio/${id}`);
                return;
              }
            }
          }}
          showVerifiedOnly={showVerifiedOnly}
          onShowVerifiedOnlyChange={setShowVerifiedOnly}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setShowAdminPanel(false)} className="text-[#666] hover:text-[#333] flex items-center gap-2 cursor-pointer ml-2">
                      <X size={20} /> Fechar
                    </button>
                  </div>
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
                              <th className="pb-4 px-4">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F8F9FA]">
                            {allUsers.map(u => (
                              <tr key={u.id} className="hover:bg-[#F8F9FA] transition-colors">
                                <td className="py-4 px-4 font-bold text-[#333]">
                                  <button 
                                    onClick={() => handleEditUser(u)}
                                    className="hover:text-[#2D5A27] hover:underline cursor-pointer text-left"
                                  >
                                    {u.name}
                                  </button>
                                  {u.is_admin && <span className="ml-2 text-[9px] bg-[#E9F0E8] text-[#2D5A27] px-1.5 py-0.5 rounded">ADMIN</span>}
                                </td>
                                <td className="py-4 px-4 text-[#666]">{u.email}</td>
                                <td className="py-4 px-4 text-[#666]">{u.city}</td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
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
                        <h3 className="text-lg font-bold text-[#333]">Solicitações de Verificação</h3>
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
                                      onClick={() => handleEditListing(l)}
                                      className="p-2 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-lg transition-all cursor-pointer"
                                      title="Editar Anúncio"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    {!l.verified && (
                                      <button 
                                        onClick={() => handleApproveVerification(l.id)}
                                        className="text-[#2D5A27] hover:underline font-bold text-xs cursor-pointer"
                                      >
                                        Verificar
                                      </button>
                                    )}
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
            ) : (
              <motion.div 
                key={showMyAds || showFavorites ? "list" : "grid"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={showMyAds || showFavorites ? "flex flex-col gap-4 w-full" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"}
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
                ) : (
                  <>
                    {showFavorites && (
                      <div className="col-span-full mb-8 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-[#333]">Meus Favoritos</h2>
                          <p className="text-sm text-[#666]">Anúncios que você marcou como interesse</p>
                        </div>
                        <button 
                          onClick={() => setShowFavorites(false)}
                          className="px-4 py-2 bg-[#F8F9FA] text-[#666] rounded-xl text-sm font-bold hover:bg-[#E9ECEF] transition-all cursor-pointer flex items-center gap-2"
                        >
                          <ChevronLeft size={16} /> Voltar para o início
                        </button>
                      </div>
                    )}
                    {showMyAds && (
                      <div className="col-span-full mb-8 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-[#333]">Meus Anúncios</h2>
                          <p className="text-sm text-[#666]">Gerencie seus anúncios publicados</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setShowAdModal(true)}
                            className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer flex items-center gap-2"
                          >
                            <Plus size={16} /> Novo Anúncio
                          </button>
                          <button 
                            onClick={() => setShowMyAds(false)}
                            className="px-4 py-2 bg-[#F8F9FA] text-[#666] rounded-xl text-sm font-bold hover:bg-[#E9ECEF] transition-all cursor-pointer flex items-center gap-2"
                          >
                            <ChevronLeft size={16} /> Voltar para o início
                          </button>
                        </div>
                      </div>
                    )}
                    {filteredListings.length > 0 ? (
                      filteredListings.map(listing => (
                        (showMyAds || showFavorites) ? (
                          <ListingListItem 
                            key={listing.id}
                            listing={listing}
                            onEdit={handleEditListing}
                            onDelete={handleDeleteListing}
                            onToggleSold={handleToggleSold}
                            onVerify={handleRequestVerification}
                            onView={(id) => router.push(`/anuncio/${id}`)}
                            onRemoveFavorite={handleToggleFavorite}
                            isOwner={user?.name === listing.seller}
                          />
                        ) : (
                          <div key={listing.id} className="flex flex-col gap-2">
                            <ListingCard 
                              listing={listing} 
                              onShare={handleShare}
                              isFavorite={favorites.map(Number).includes(Number(listing.id))}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        )
                      ))
                    ) : (
                      <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-4 text-[#999]">
                          {showFavorites ? <Heart size={32} /> : showMyAds ? <Megaphone size={32} /> : <Search size={32} />}
                        </div>
                        <h3 className="text-lg font-bold text-[#333]">
                          {showFavorites ? 'Você ainda não tem favoritos' : showMyAds ? 'Você ainda não tem anúncios' : 'Nenhum anúncio encontrado'}
                        </h3>
                        <p className="text-sm text-[#666]">
                          {showFavorites ? 'Explore os anúncios e clique no coração para salvar.' : showMyAds ? 'Anuncie agora mesmo para começar a vender!' : 'Tente ajustar seus filtros de busca.'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      
      {/* --- Modals --- */}
      
      {/* User Management Modal (Admin) */}
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
                    {showAuthSuggestions && citySuggestionsAuth.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-[#E9ECEF] rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                        {citySuggestionsAuth.map(city => (
                          <button
                            key={city.name}
                            type="button"
                            onClick={() => {
                              setAuthForm({...authForm, city: city.name});
                              setCitySearchAuth(city.name);
                              setShowAuthSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <MapPin size={14} className="text-[#999]" />
                            {city.name}
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

      {/* Share Modal */}
      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={selectedListingForShare ? `${window.location.origin}/anuncio/${selectedListingForShare.id}` : ''}
        title={selectedListingForShare?.title || ''}
        onCopySuccess={() => {
          setFavoriteToastMessage('Link copiado!');
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 3000);
        }}
      />

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
              {isSubmittingAd && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-[#2D5A27] animate-pulse">Processando anúncio...</h3>
                  <p className="text-sm text-[#666] mt-2">Carregando dados e imagens, por favor aguarde.</p>
                </div>
              )}
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-[#333]">
                    {editingListingId ? 'Editar Anúncio' : 'Novo Anúncio'}
                  </h2>
                  <button onClick={() => { setShowAdModal(false); setEditingListingId(null); }} className="text-[#999] hover:text-[#333] cursor-pointer">
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
                    {editingListingId ? 'Salvar Alterações' : 'Publicar Anúncio'}
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
            <Check size={18} className="text-[#28A745]" /> {favoriteToastMessage || 'Link copiado para a área de transferência!'}
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

      {/* Loading Overlay for Updates */}
      {isUpdatingListing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin" />
            <p className="text-[#333] font-bold">Atualizando anúncio...</p>
          </div>
        </div>
      )}

      <BottomNav 
        user={user} 
        onAdClick={() => setShowAdModal(true)} 
        onAuthClick={() => setShowAuthModal(true)} 
      />
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

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

interface UserContextType {
  user: any;
  setUser: (user: any) => void;
  logout: () => void;
  isAuthReady: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'login' | 'register' | 'forgot';
  setAuthMode: (mode: 'login' | 'register' | 'forgot') => void;
  favorites: number[];
  setFavorites: (favs: number[]) => void;
  toggleFavorite: (listingId: number) => Promise<boolean>;
  showAdModal: boolean;
  setShowAdModal: (show: boolean) => void;
  editingListing: any | null;
  setEditingListing: (listing: any | null) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  fetchUnreadCount: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [editingListing, setEditingListing] = useState<any | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Buscar perfil completo na tabela pública
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('UserContext: Buscando perfil para ID:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('UserContext: Erro ao buscar perfil (Pode ser RLS):', error.message);
        
        // Fallback: usar dados da sessão atual do Supabase Auth
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('UserContext: Aplicando fallback de dados do Supabase Auth para:', session.user.email);
          const fallbackUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || 'Usuário',
            is_admin: session.user.user_metadata?.is_admin || false,
            role: session.user.user_metadata?.is_admin ? 'admin' : 'user'
          };
          setUserState(fallbackUser);
          fetchFavorites(userId);
        }
        setIsAuthReady(true);
        return;
      }

      if (data) {
        console.log('UserContext: Perfil carregado com sucesso para:', data.email);
        setUserState(data);
        fetchFavorites(userId);

        // Ativa Draft Mode se o usuário for admin (bypass de ISR)
        if (data.role === 'admin') {
          fetch(`/api/draft?secret=${process.env.NEXT_PUBLIC_DRAFT_MODE_SECRET}`)
            .then(() => console.log('UserContext: Draft Mode ativado para admin.'))
            .catch((err) => console.warn('UserContext: Falha ao ativar Draft Mode:', err));
        }
      }
    } catch (err) {
      console.error('UserContext: Exceção ao buscar perfil:', err);
    } finally {
      setIsAuthReady(true);
    }
  };

  const fetchFavorites = async (userId: string) => {
    try {
      const res = await authenticatedFetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFavorites(data);
        }
      }
    } catch (err) {
      console.error('UserContext: Erro ao buscar favoritos:', err);
    }
  };

  const toggleFavorite = async (listingId: number): Promise<boolean> => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return false;
    }

    const listingIdNum = Number(listingId);
    const isFavorite = favorites.map(Number).includes(listingIdNum);
    const method = isFavorite ? 'DELETE' : 'POST';

    try {
      const res = await authenticatedFetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, listingId: listingIdNum })
      });

      if (res.ok) {
        if (isFavorite) {
          setFavorites(prev => prev.filter(id => Number(id) !== listingIdNum));
        } else {
          setFavorites(prev => [...prev, listingIdNum]);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling favorite in context:', error);
      return false;
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await authenticatedFetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        const count = data.filter((m: any) => !m.is_read).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('UserContext: Erro ao buscar contagem de não lidas:', err);
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    console.log('UserContext: Inicializando monitor de autenticação...');
    
    // Fase 1: Verificar sessão via cookie do servidor (/api/auth/me).
    // Usa authenticatedFetch para enviar o Bearer token junto (mais confiável que só cookies).
    authenticatedFetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        return { user: null };
      })
      .then(({ user: serverUser }) => {
        if (serverUser?.id) {
          console.log('UserContext: Sessão restaurada via servidor:', serverUser.email);
          setUserState(serverUser);
          fetchFavorites(serverUser.id);
          if (serverUser.role === 'admin') {
            authenticatedFetch(`/api/draft?secret=${process.env.NEXT_PUBLIC_DRAFT_MODE_SECRET}`)
              .then(() => console.log('UserContext: Draft Mode ativado para admin.'))
              .catch((err) => console.warn('UserContext: Falha ao ativar Draft Mode:', err));
          }
        } else {
          console.log('UserContext: Nenhuma sessão de servidor encontrada.');
        }
      })
      .catch(err => {
        console.error('UserContext: Erro ao verificar sessão do servidor:', err);
      })
      .finally(() => {
        setIsAuthReady(true);
      });

    // Fase 2: Também ouvir eventos do cliente Supabase (Login/Logout em tempo real).
    // Isso captura eventos que acontecem sem refresh de página (ex: login pelo modal).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('UserContext: Evento de Auth detetado:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        // Buscar perfil completo do servidor para garantir dados atualizados
        fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserState(null);
        setFavorites([]);
        setIsAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setUser = (newUser: any) => {
    if (newUser && newUser.id) {
      setUserState((prevUser: any) => {
        if (prevUser && prevUser.id === newUser.id) {
          return { ...prevUser, ...newUser };
        }
        return newUser;
      });
      fetchUserProfile(newUser.id);
    } else {
      setUserState(newUser);
    }
    if (!newUser) setFavorites([]);
  };

  const logout = async () => {
    // Desativa Draft Mode antes de fazer logout (restaura ISR normal)
    fetch('/api/draft', { method: 'DELETE' })
      .catch((err) => console.warn('UserContext: Falha ao desativar Draft Mode:', err));
    await supabase.auth.signOut();
  };

  return (
    <UserContext.Provider value={{ 
      user, setUser, logout, isAuthReady, 
      showAuthModal, setShowAuthModal, 
      authMode, setAuthMode,
      favorites, setFavorites, toggleFavorite,
      showAdModal, setShowAdModal,
      editingListing, setEditingListing,
      unreadCount, setUnreadCount, fetchUnreadCount
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};


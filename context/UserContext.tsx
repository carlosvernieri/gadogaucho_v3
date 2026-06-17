'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
      const { data } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', userId);
      
      if (data) {
        setFavorites(data.map((f: any) => f.listing_id));
      }
    } catch (err) {
      console.error('UserContext: Erro ao buscar favoritos:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/messages');
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
    
    // 1. Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('UserContext: Sessão inicial encontrada:', session.user.email);
        fetchUserProfile(session.user.id);
      } else {
        console.log('UserContext: Nenhuma sessão inicial encontrada.');
        setIsAuthReady(true);
      }
    });

    // 2. Ouvir mudanças de estado (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('UserContext: Evento de Auth detetado:', event);
      if (event === 'SIGNED_IN' && session?.user) {
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
    setUserState(newUser);
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
      favorites, setFavorites,
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


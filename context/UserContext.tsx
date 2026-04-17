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
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  favorites: number[];
  setFavorites: (favs: number[]) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [favorites, setFavorites] = useState<number[]>([]);

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
    await supabase.auth.signOut();
  };

  return (
    <UserContext.Provider value={{ 
      user, setUser, logout, isAuthReady, 
      showAuthModal, setShowAuthModal, 
      authMode, setAuthMode,
      favorites, setFavorites 
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


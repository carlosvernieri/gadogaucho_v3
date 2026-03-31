'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeJsonStringify } from '@/lib/utils';

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

  useEffect(() => {
    const stored = localStorage.getItem('gado_gaucho_user');
    if (stored) {
      const parsedUser = JSON.parse(stored);
      setUserState(parsedUser);
      // Fetch favorites if user exists
      fetch(`/api/favorites?userId=${parsedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setFavorites(data);
        })
        .catch(err => console.error('Error fetching favorites:', err));
    }
    setIsAuthReady(true);
  }, []);

  const setUser = (newUser: any) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('gado_gaucho_user', safeJsonStringify(newUser));
    } else {
      localStorage.removeItem('gado_gaucho_user');
      setFavorites([]);
    }
  };

  const logout = () => {
    setUserState(null);
    localStorage.removeItem('gado_gaucho_user');
    setFavorites([]);
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

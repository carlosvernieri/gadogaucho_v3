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
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserState(data.user);
            localStorage.setItem('gado_gaucho_user', safeJsonStringify(data.user));
            
            fetch(`/api/favorites`)
              .then(res => res.json())
              .then(favData => {
                if (Array.isArray(favData)) setFavorites(favData);
              })
              .catch(err => console.error('Error fetching favorites:', err));
          } else {
            setUserState(null);
            localStorage.removeItem('gado_gaucho_user');
          }
        } else {
          setUserState(null);
          localStorage.removeItem('gado_gaucho_user');
        }
      } catch (err) {
        console.error('Session fetch failed', err);
        const stored = localStorage.getItem('gado_gaucho_user');
        if (stored) {
          setUserState(JSON.parse(stored));
        }
      } finally {
        setIsAuthReady(true);
      }
    };
    fetchSession();
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

  const logout = async () => {
    setUserState(null);
    localStorage.removeItem('gado_gaucho_user');
    setFavorites([]);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch(e) {
      console.error(e);
    }
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

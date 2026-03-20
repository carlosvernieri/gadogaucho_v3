'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextType {
  user: any;
  setUser: (user: any) => void;
  logout: () => void;
  isAuthReady: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('gado_gaucho_user');
    if (stored) {
      setUserState(JSON.parse(stored));
    }
    setIsAuthReady(true);
  }, []);

  const setUser = (newUser: any) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('gado_gaucho_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('gado_gaucho_user');
    }
  };

  const logout = () => {
    setUserState(null);
    localStorage.removeItem('gado_gaucho_user');
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, isAuthReady }}>
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

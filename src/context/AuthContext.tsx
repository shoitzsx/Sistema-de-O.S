import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../lib/supabase';
import { getCurrentUserProfile } from '../lib/supabaseApi';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncProfile = async () => {
      try {
        const profile = await getCurrentUserProfile();

        if (!isMounted) return;

        if (profile) {
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        } else {
          const storedUser = localStorage.getItem('user');
          setUser(storedUser ? JSON.parse(storedUser) : null);
        }
      } catch (err) {
        if (!isMounted) return;
        const storedUser = localStorage.getItem('user');
        setUser(storedUser ? JSON.parse(storedUser) : null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void syncProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (!session) {
        setUser(null);
        localStorage.removeItem('user');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      void syncProfile();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

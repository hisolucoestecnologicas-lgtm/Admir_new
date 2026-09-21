import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, GranularPermissions, UserRole } from '../types';
import { api } from '../lib/api';
import { signInWithGoogle, signOutFirebase } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  hasPermission: (perm: keyof GranularPermissions) => boolean;
  login: (email: string, pass: string) => Promise<User>;
  loginWithGoogleAuth: () => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('admir_auth_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (e) {
      console.warn('Session expired or invalid:', e);
      localStorage.removeItem('admir_auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await api.login(email, pass);
    setUser(res.user);
    return res.user;
  };

  const loginWithGoogleAuth = async (): Promise<User> => {
    const googleUser = await signInWithGoogle();
    if (!googleUser.email) {
      throw new Error('A conta Google não forneceu um endereço de e-mail válido.');
    }

    const res = await api.loginWithGoogle({
      email: googleUser.email,
      displayName: googleUser.displayName,
      photoURL: googleUser.photoURL,
      firebaseUid: googleUser.uid,
    });

    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await signOutFirebase();
    } catch (e) {
      // ignore
    }
    await api.logout();
    setUser(null);
  };

  const hasPermission = (perm: keyof GranularPermissions): boolean => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    return Boolean(user.permissions && user.permissions[perm]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isOwner: user?.role === 'owner',
        hasPermission,
        login,
        loginWithGoogleAuth,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

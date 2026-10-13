import React, { createContext, useContext, useState, useEffect } from 'react';

export type LoginResult = 'ok' | 'wrong-password' | 'unreachable';

interface AdminContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });

  const login = async (password: string): Promise<LoginResult> => {
    // Import bcryptjs dynamically to avoid SSR issues
    const bcrypt = await import('bcryptjs');

    // Fetch the hash from settings
    const { supabase } = await import('@/lib/supabase');
    const { data: settings, error } = await supabase
      .from('settings')
      .select('admin_password_hash')
      .eq('id', 1)
      .single();

    // A failed lookup must never fall through to a password check: treating it
    // as a wrong password hid outages behind a retry, and any fallback hash
    // here would let anyone in simply by blocking this request.
    if (error || !settings) return 'unreachable';

    const hash = settings.admin_password_hash;
    if (!hash) return 'unreachable';

    const valid = await bcrypt.compare(password, hash);
    if (!valid) return 'wrong-password';

    sessionStorage.setItem('admin_auth', 'true');
    setIsAuthenticated(true);
    return 'ok';
  };

  const logout = () => {
    sessionStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  return (
    <AdminContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

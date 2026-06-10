import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });

  const login = async (password: string): Promise<boolean> => {
    // Import bcryptjs dynamically to avoid SSR issues
    const bcrypt = await import('bcryptjs');

    // Fetch the hash from settings
    const { supabase } = await import('@/lib/supabase');
    const { data: settings } = await supabase
      .from('settings')
      .select('admin_password_hash')
      .eq('id', 1)
      .single();

    let hash = settings?.admin_password_hash;

    // If no hash set, use default "admin123"
    if (!hash) {
      // default password hash for "admin123"
      hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    }

    const valid = await bcrypt.compare(password, hash);
    if (valid) {
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
    }
    return valid;
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

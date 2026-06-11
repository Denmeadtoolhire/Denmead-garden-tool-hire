import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Wrench,
  CalendarCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Users,
} from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/tools', label: 'Tools', icon: Wrench },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { logout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customerCount, setCustomerCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  useEffect(() => {
    const loadCustomerCount = async () => {
      try {
        const { count, error } = await supabase
          .from('customers')
          .select('id', { count: 'exact', head: true });
        if (!error) {
          setCustomerCount(count || 0);
        }
      } catch (err) {
        console.error('Error loading customer count:', err);
      }
    };
    loadCustomerCount();
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="bg-brand-green-dark px-4 py-5">
        <div className="flex items-center gap-2">
          <Wrench className="text-brand-gold" size={20} />
          <span className="text-white font-bold text-sm leading-tight">
            Denmead Tool Hire
          </span>
        </div>
        <p className="text-green-300 text-xs mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3">
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3 transition-colors text-sm font-medium text-green-200 hover:bg-green-800 hover:text-white border-b border-green-700 pb-3"
        >
          <Home size={18} />
          View Site
        </Link>

        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm font-medium ${
              location.pathname === to
                ? 'bg-brand-gold text-brand-green'
                : 'text-gray-300 hover:bg-green-800 hover:text-white'
            }`}
          >
            <Icon size={18} />
            {label}
            {label === 'Customers' && customerCount > 0 && (
              <span className="ml-auto bg-brand-gold text-brand-green text-xs font-bold px-2 py-0.5 rounded-full">
                {customerCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-green-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-brand-green flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-56 bg-brand-green flex-col z-50 md:hidden transition-transform duration-200 ${
          sidebarOpen ? 'flex translate-x-0' : '-translate-x-full hidden'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-white"
        >
          <X size={20} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden bg-brand-green text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="font-semibold">Admin Panel</span>
        </div>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;

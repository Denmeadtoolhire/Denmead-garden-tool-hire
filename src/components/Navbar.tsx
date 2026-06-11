import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const LOGO = 'https://res.cloudinary.com/da5zsuxlz/image/upload/v1781197783/logo_ncga2w.png';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/tools', label: 'Hire Tools' },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="bg-brand-green sticky top-0 z-50 border-b border-white/10" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center">
            <img src={LOGO} alt="Denmead Tool & Garden Hire" className="h-14 w-auto object-contain rounded-xl" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`relative font-semibold text-sm tracking-wide transition-colors pb-1 group ${
                  isActive(l.to)
                    ? 'text-brand-gold'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                {l.label}
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-brand-gold transition-all duration-200 ${
                    isActive(l.to) ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </Link>
            ))}
            <Link
              to="/tools"
              className="bg-brand-gold text-brand-green font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-yellow-400 transition-colors shadow-sm"
            >
              Book Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-5 pt-2 flex flex-col gap-1 mobile-menu-enter border-t border-white/10 mt-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`font-semibold py-2.5 px-2 rounded-lg transition-colors ${
                  isActive(l.to)
                    ? 'text-brand-gold bg-white/5'
                    : 'text-white/90 hover:text-white hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/tools"
              onClick={() => setOpen(false)}
              className="mt-2 bg-brand-gold text-brand-green font-bold text-center py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Book Now
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

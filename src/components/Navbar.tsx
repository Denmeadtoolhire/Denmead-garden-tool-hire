import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Wrench } from 'lucide-react';

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
    <nav className="bg-brand-green shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Wrench className="text-brand-gold" size={24} />
            <span className="text-white font-bold text-lg leading-tight">
              Denmead Tool &amp; Garden Hire
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`font-medium transition-colors ${
                  isActive(l.to)
                    ? 'text-brand-gold'
                    : 'text-white hover:text-brand-gold'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/tools"
              className="bg-brand-gold text-brand-green font-bold px-4 py-2 rounded-md hover:bg-brand-gold-dark transition-colors"
            >
              Book Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`font-medium py-2 transition-colors ${
                  isActive(l.to) ? 'text-brand-gold' : 'text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/tools"
              onClick={() => setOpen(false)}
              className="bg-brand-gold text-brand-green font-bold px-4 py-2 rounded-md text-center"
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

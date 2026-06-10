import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Wrench } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-brand-green text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="text-brand-gold" size={20} />
              <span className="font-bold text-lg">Denmead Tool &amp; Garden Hire</span>
            </div>
            <p className="text-green-200 text-sm">Your Community Tool Rental Experts</p>
          </div>

          <div>
            <h3 className="font-semibold text-brand-gold mb-3">Contact Us</h3>
            <div className="space-y-2 text-sm text-green-100">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-gold" />
                <span>1 Inhams Lane, Denmead, PO7 6LX</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-brand-gold" />
                <a href="tel:07889765153" className="hover:text-brand-gold transition-colors">
                  07889 765153
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-brand-gold" />
                <a
                  href="mailto:denmeadtoolhire@gmail.com"
                  className="hover:text-brand-gold transition-colors"
                >
                  denmeadtoolhire@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-brand-gold mb-3">Quick Links</h3>
            <div className="space-y-2 text-sm">
              <div>
                <Link to="/" className="text-green-100 hover:text-brand-gold transition-colors">
                  Home
                </Link>
              </div>
              <div>
                <Link to="/tools" className="text-green-100 hover:text-brand-gold transition-colors">
                  Browse Tools
                </Link>
              </div>
              <div>
                <Link to="/admin" className="text-green-100 hover:text-brand-gold transition-colors">
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-green-700 mt-8 pt-6 text-center text-sm text-green-300">
          &copy; {new Date().getFullYear()} Denmead Tool and Garden Hire Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

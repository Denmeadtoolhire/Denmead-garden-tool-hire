import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Wrench, Clock } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="text-brand-gold" size={22} />
              <span className="font-extrabold text-lg tracking-tight">
                Denmead Tool &amp; Garden Hire
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Your friendly, local tool hire service in Denmead — making quality equipment
              accessible to the community.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={13} />
              <span>Mon–Sat 8am–6pm</span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-brand-gold mb-4 text-sm uppercase tracking-wide">
              Contact Us
            </h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-brand-gold" />
                <span>1 Inhams Lane, Denmead, PO7 6LX</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-brand-gold shrink-0" />
                <a href="tel:07889765153" className="hover:text-brand-gold transition-colors">
                  07889 765153
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-brand-gold shrink-0" />
                <a
                  href="mailto:denmeadtoolhire@gmail.com"
                  className="hover:text-brand-gold transition-colors break-all"
                >
                  denmeadtoolhire@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-brand-gold mb-4 text-sm uppercase tracking-wide">
              Quick Links
            </h3>
            <div className="space-y-2.5 text-sm">
              <div>
                <Link to="/" className="text-slate-300 hover:text-brand-gold transition-colors">
                  Home
                </Link>
              </div>
              <div>
                <Link to="/tools" className="text-slate-300 hover:text-brand-gold transition-colors">
                  Hire Tools
                </Link>
              </div>
              <div>
                <Link to="/admin" className="text-slate-300 hover:text-brand-gold transition-colors">
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            &copy; {new Date().getFullYear()} Denmead Tool and Garden Hire Ltd. All rights reserved.
          </span>
          <span>Website by Denmead Tool Hire</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf,
  Hammer,
  Home as HomeIcon,
  CheckCircle,
  Phone,
  MapPin,
  Mail,
  Search,
  CalendarCheck,
  Truck,
  ShieldCheck,
  Banknote,
  Star,
  Clock,
  Package,
} from 'lucide-react';

const LOGO = 'https://res.cloudinary.com/da5zsuxlz/image/upload/v1781197783/logo_ncga2w.png';

const categories = [
  {
    icon: Leaf,
    label: 'Garden Tools',
    desc: 'Lawnmowers, hedge trimmers, rotavators and more.',
    count: '11 tools available',
    color: 'from-green-700 to-brand-green',
  },
  {
    icon: Hammer,
    label: 'DIY Tools',
    desc: 'Drills, sanders and power tools for your projects.',
    count: '12 tools available',
    color: 'from-emerald-800 to-green-700',
  },
  {
    icon: HomeIcon,
    label: 'Home Tools',
    desc: 'Pressure washers, carpet cleaners and household kit.',
    count: '10 tools available',
    color: 'from-teal-800 to-emerald-700',
  },
];

const steps = [
  {
    number: '1',
    icon: Search,
    title: 'Browse',
    desc: 'Choose from our range of quality tools across garden, DIY and home categories.',
  },
  {
    number: '2',
    icon: CalendarCheck,
    title: 'Book',
    desc: 'Select your date and hire period online — 4-hour or full-day options available.',
  },
  {
    number: '3',
    icon: Truck,
    title: 'Collect',
    desc: 'Pick up from us in Denmead at your chosen time. Ready and waiting for you.',
  },
];

const whyUs = [
  {
    icon: CheckCircle,
    title: 'Easy Online Booking',
    desc: 'Reserve tools in minutes — pick your date, time and confirm in just a few clicks.',
  },
  {
    icon: ShieldCheck,
    title: 'Anti Double-Booking',
    desc: 'Our system automatically prevents clashes, so your booking is always guaranteed.',
  },
  {
    icon: Banknote,
    title: 'Flexible Pricing',
    desc: 'Choose 4-hour or full-day hire to suit your project and your budget.',
  },
];

const stats = [
  { icon: Package, value: '33+', label: 'Tools Available' },
  { icon: Clock, value: 'Same Day', label: 'Booking Available' },
  { icon: MapPin, value: 'Local', label: 'Collection Point' },
];

const HomePage = () => {
  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative bg-brand-green text-white overflow-hidden">
        {/* Subtle diagonal stripe texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
          <img
            src={LOGO}
            alt="Denmead Tool & Garden Hire"
            className="h-48 w-auto object-contain mx-auto mb-8 drop-shadow-lg rounded-3xl"
          />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 leading-tight tracking-tight">
            Hire the Tools You Need,
            <br />
            <span className="text-brand-gold">When You Need Them</span>
          </h1>
          <p className="text-xl text-green-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Denmead's friendly local tool hire service — garden equipment, DIY tools and home
            appliances, available for half-day or full-day hire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/tools"
              className="bg-brand-gold text-brand-green font-extrabold px-8 py-4 rounded-xl text-lg hover:bg-yellow-400 transition-colors shadow-lg"
            >
              Browse &amp; Book Tools
            </Link>
            <a
              href="tel:07889765153"
              className="border-2 border-white/70 text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-colors"
            >
              Call Us: 07889 765153
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {[
              { icon: Star, text: 'Trusted Local Business' },
              { icon: Package, text: '33+ Tools Available' },
              { icon: Clock, text: 'Same-Day Booking' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm font-medium text-white/90"
              >
                <Icon size={15} className="text-brand-gold" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              How It Works
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              From browsing to collecting — it's quick and straightforward.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-green-100 -translate-y-1/2 z-0" />
            {steps.map(({ number, icon: Icon, title, desc }) => (
              <div key={title} className="text-center relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-green rounded-full mb-5 shadow-md mx-auto relative">
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-brand-gold rounded-full text-brand-green text-xs font-extrabold flex items-center justify-center shadow">
                    {number}
                  </span>
                  <Icon size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              Browse by Category
            </h2>
            <p className="text-gray-500 text-lg">Find exactly what you need for your project.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map(({ icon: Icon, label, desc, count, color }) => (
              <Link
                key={label}
                to="/tools"
                className="card-hover group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-gray-100 flex flex-col"
              >
                <div className={`bg-gradient-to-br ${color} p-8 flex items-center justify-center`}>
                  <Icon size={52} className="text-white drop-shadow" />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{label}</h3>
                  <p className="text-gray-500 text-sm mb-4 flex-1">{desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-green bg-green-50 px-2.5 py-1 rounded-full">
                      {count}
                    </span>
                    <span className="text-brand-green font-bold text-sm group-hover:underline">
                      Browse Tools →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              Why Choose Denmead Tool Hire?
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              We've built something simple, fair and reliable for our community.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {whyUs.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="shrink-0 w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <Icon size={24} className="text-brand-green" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community Stats / Trust ── */}
      <section className="py-20" style={{ backgroundColor: '#f0f7f2' }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Serving the Denmead Community
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            We're a local family business based in Denmead, PO7 — committed to making tool hire
            easy, honest and affordable for our neighbours and the wider community.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="bg-white rounded-2xl p-8 shadow-sm border border-green-100 flex flex-col items-center"
              >
                <div className="w-14 h-14 bg-brand-green rounded-full flex items-center justify-center mb-4">
                  <Icon size={26} className="text-white" />
                </div>
                <p className="text-3xl font-extrabold text-brand-green mb-1">{value}</p>
                <p className="text-gray-500 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-brand-green text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Hire?</h2>
          <p className="text-green-200 text-lg mb-8 max-w-xl mx-auto">
            Browse our full range and book online in minutes — or give us a call.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Link
              to="/tools"
              className="bg-brand-gold text-brand-green font-extrabold px-8 py-4 rounded-xl text-lg hover:bg-yellow-400 transition-colors shadow-lg"
            >
              Browse Tools Now
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 justify-center text-green-100 text-sm">
            <div className="flex items-center gap-2 justify-center">
              <MapPin size={16} className="text-brand-gold" />
              1 Inhams Lane, Denmead, PO7 6LX
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Phone size={16} className="text-brand-gold" />
              <a href="tel:07889765153" className="hover:text-white transition-colors">
                07889 765153
              </a>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Mail size={16} className="text-brand-gold" />
              <a href="mailto:denmeadtoolhire@gmail.com" className="hover:text-white transition-colors">
                denmeadtoolhire@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

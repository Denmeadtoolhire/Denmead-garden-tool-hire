import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Hammer, Home, CheckCircle, Phone, MapPin, Clock } from 'lucide-react';

const features = [
  {
    icon: CheckCircle,
    title: 'Easy Online Booking',
    desc: 'Reserve tools in minutes — pick your date, time and confirm.',
  },
  {
    icon: Clock,
    title: 'Flexible Hire Periods',
    desc: '4-hour half-day hire or a full-day option to suit your project.',
  },
  {
    icon: MapPin,
    title: 'Local & Community',
    desc: 'Based in Denmead, serving the local community since day one.',
  },
];

const categories = [
  { icon: Leaf, label: 'Garden Tools', desc: 'Lawnmowers, hedge trimmers, rotavators and more.' },
  { icon: Hammer, label: 'DIY Tools', desc: 'Drills, sanders and power tools for your projects.' },
  { icon: Home, label: 'Home Tools', desc: 'Pressure washers, carpet cleaners and household kit.' },
];

const HomePage = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-green to-brand-green-light text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <img
            src="https://res.cloudinary.com/da5zsuxlz/image/upload/v1781197783/logo_ncga2w.png"
            alt="Denmead Tool & Garden Hire"
            className="h-40 w-auto object-contain mx-auto mb-8"
          />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Hire the Tools You Need,<br />
            <span className="text-brand-gold">When You Need Them</span>
          </h1>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Denmead's friendly local tool hire service — garden equipment, DIY tools and home
            appliances available for half-day or full-day hire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/tools"
              className="bg-brand-gold text-brand-green font-bold px-8 py-4 rounded-xl text-lg hover:bg-brand-gold-dark transition-colors shadow-lg"
            >
              Browse & Book Tools
            </Link>
            <a
              href="tel:07889765153"
              className="border-2 border-white text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-white hover:text-brand-green transition-colors"
            >
              Call Us: 07889 765153
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">
            Why Choose Denmead Tool Hire?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mb-4">
                  <Icon className="text-brand-green" size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">
            What Can We Hire You?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map(({ icon: Icon, label, desc }) => (
              <Link
                key={label}
                to="/tools"
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-green rounded-lg mb-4 group-hover:bg-brand-green-dark transition-colors">
                  <Icon className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">{label}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/tools"
              className="inline-block bg-brand-green text-white font-bold px-8 py-3 rounded-xl hover:bg-brand-green-dark transition-colors"
            >
              View All Tools
            </Link>
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section className="bg-brand-green text-white py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Have a Question?</h2>
            <p className="text-green-200">We're happy to help. Get in touch with us directly.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="tel:07889765153"
              className="flex items-center gap-2 bg-white text-brand-green font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Phone size={18} />
              07889 765153
            </a>
            <a
              href="mailto:denmeadtoolhire@gmail.com"
              className="flex items-center gap-2 border-2 border-white text-white font-bold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

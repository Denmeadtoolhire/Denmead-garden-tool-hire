import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CheckCircle, MapPin, Phone, Mail, Calendar, Clock } from 'lucide-react';
import type { Booking, Tool, Settings } from '@/lib/supabase';

const BookingConfirmationPage = () => {
  const location = useLocation();
  const state = location.state as { booking: Booking; tool: Tool; settings: Settings } | undefined;

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No booking information found.</p>
          <Link to="/tools" className="text-brand-green font-semibold hover:underline">
            Browse Tools
          </Link>
        </div>
      </div>
    );
  }

  const { booking, tool, settings } = state;
  const startDate = parseISO(booking.start_time);
  const endDate = parseISO(booking.end_time);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="text-brand-green" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">
            A confirmation email has been sent to <strong>{booking.customer_email}</strong>
          </p>
        </div>

        {/* Booking details card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          <div className="bg-brand-green text-white px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">{tool.name}</h2>
              <span className="text-brand-gold font-bold text-lg">
                £{Number(booking.hire_type === '4hr' ? tool.price_4hr : tool.price_1day).toFixed(2)}
              </span>
            </div>
            <p className="text-green-200 text-sm mt-1">
              Booking ref: {booking.id.substring(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="text-brand-green mt-0.5" size={18} />
              <div>
                <p className="font-medium text-gray-800">
                  {format(startDate, 'EEEE d MMMM yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="text-brand-green mt-0.5" size={18} />
              <div>
                <p className="font-medium text-gray-800">
                  {booking.hire_type === '1day'
                    ? `Full day (${settings.opening_time} – ${settings.closing_time})`
                    : `${format(startDate, 'HH:mm')} – ${format(endDate, 'HH:mm')}`}
                </p>
                <p className="text-sm text-gray-500">
                  {booking.hire_type === '4hr' ? '4 Hour hire' : 'Full day hire'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="text-brand-green mt-0.5" size={18} />
              <div>
                <p className="font-medium text-gray-800">Collection Address</p>
                <p className="text-gray-600">{settings.address}</p>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <p className="font-medium text-gray-800 mb-1">Customer Details</p>
              <p className="text-gray-600 text-sm">{booking.customer_name}</p>
              <p className="text-gray-600 text-sm">{booking.customer_email}</p>
              <p className="text-gray-600 text-sm">{booking.customer_phone}</p>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-brand-gold bg-opacity-10 border border-brand-gold rounded-xl p-4 mb-6">
          <p className="font-semibold text-gray-800 mb-2">Need to cancel or have questions?</p>
          <div className="flex flex-col gap-2 text-sm">
            <a
              href={`tel:${settings.phone}`}
              className="flex items-center gap-2 text-brand-green hover:underline"
            >
              <Phone size={14} />
              {settings.phone}
            </a>
            <a
              href={`mailto:${settings.email}`}
              className="flex items-center gap-2 text-brand-green hover:underline"
            >
              <Mail size={14} />
              {settings.email}
            </a>
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            to="/tools"
            className="flex-1 text-center bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            Book Another Tool
          </Link>
          <Link
            to="/"
            className="flex-1 text-center border-2 border-brand-green text-brand-green font-semibold py-3 rounded-xl hover:bg-green-50 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;

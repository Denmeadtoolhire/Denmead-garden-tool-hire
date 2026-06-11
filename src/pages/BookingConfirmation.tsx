import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Clock, Calendar, Mail } from 'lucide-react';
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <Mail className="text-brand-green" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Booking Request Received!</h1>
          <p className="text-gray-600 leading-relaxed">
            Thank you <strong>{booking.customer_name}</strong>! Your request to hire the{' '}
            <strong>{tool.name}</strong> has been submitted. We'll review your request and be in
            touch shortly to confirm your booking.
          </p>
        </div>

        {/* Request details card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          <div className="bg-brand-green text-white px-6 py-4">
            <h2 className="font-bold text-lg">{tool.name}</h2>
            <p className="text-green-200 text-sm mt-1">
              Request ref: {booking.id.substring(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="text-brand-green mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
                  Requested Date
                </p>
                <p className="font-medium text-gray-800">
                  {format(startDate, 'EEEE d MMMM yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="text-brand-green mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
                  Requested Time
                </p>
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

            <hr className="border-gray-100" />

            <div>
              <p className="font-medium text-gray-800 mb-1">Your Details</p>
              <p className="text-gray-600 text-sm">{booking.customer_name}</p>
              <p className="text-gray-600 text-sm">{booking.customer_email}</p>
              <p className="text-gray-600 text-sm">{booking.customer_phone}</p>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-brand-gold bg-opacity-10 border border-brand-gold rounded-xl p-4 mb-6">
          <p className="font-semibold text-gray-800 mb-2">What happens next?</p>
          <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
            <li>We'll review your request and check availability</li>
            <li>You'll receive an email confirming or suggesting an alternative time</li>
            <li>Please check your inbox at <strong>{booking.customer_email}</strong></li>
          </ul>
        </div>

        <div className="flex gap-4">
          <Link
            to="/tools"
            className="flex-1 text-center bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            Browse More Tools
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

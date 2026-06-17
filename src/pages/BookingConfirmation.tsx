import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Clock, Calendar, Mail } from 'lucide-react';
import { supabase, type Booking, type Settings } from '@/lib/supabase';
import AddToHomeScreen from '@/components/AddToHomeScreen';

const BookingConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }

      try {
        const [bookingRes, settingsRes] = await Promise.all([
          supabase
            .from('bookings')
            .select(`
              *,
              booking_items(id, tool_id, quantity, price_at_booking, tools(name))
            `)
            .eq('id', bookingId)
            .single(),
          supabase.from('settings').select('*').single(),
        ]);

        if (bookingRes.data) setBooking(bookingRes.data as Booking);
        if (settingsRes.data) setSettings(settingsRes.data);
      } catch (error) {
        console.error('Error loading booking:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [bookingId]);

  useEffect(() => {
    if (!loading && booking) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, booking]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading booking details...</p>
      </div>
    );
  }

  if (!booking || !settings) {
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

  const startDate = parseISO(booking.start_time);
  const endDate = parseISO(booking.end_time);
  const isMultiTool = booking.booking_items && booking.booking_items.length > 0;
  const toolsList = isMultiTool
    ? booking.booking_items!.map(bi => bi.tools?.name || 'Unknown').join(', ')
    : 'Your tools';

  return (
    <>
    {showInstallPrompt && <AddToHomeScreen onClose={() => setShowInstallPrompt(false)} />}
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <Mail className="text-brand-green" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Booking Request Received!</h1>
          <p className="text-gray-600 leading-relaxed">
            Thank you <strong>{booking.customer_name}</strong>! Your request to hire{' '}
            {isMultiTool ? 'multiple tools' : 'a tool'} has been submitted. We'll review your
            request and be in touch shortly to confirm your booking.
          </p>
        </div>

        {/* Request details card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          <div className="bg-brand-green text-white px-6 py-4">
            <h2 className="font-bold text-lg">
              {isMultiTool ? 'Multi-Tool Booking' : 'Tool Booking'}
            </h2>
            <p className="text-green-200 text-sm mt-1">
              Request ref: {booking.id.substring(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {isMultiTool && booking.booking_items && (
              <div>
                <p className="font-semibold text-gray-800 mb-3">Items</p>
                <ul className="space-y-2">
                  {booking.booking_items.map((item) => (
                    <li key={item.id} className="text-sm text-gray-700 flex justify-between">
                      <span>{item.tools?.name}</span>
                      <span className="font-medium">Qty: {item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <hr className="border-gray-100 my-4" />
              </div>
            )}

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

        <div className="flex gap-4 mb-4">
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

        {booking.response_token && (
          <p className="text-center text-sm text-gray-500">
            Changed your mind?{' '}
            <Link
              to={`/booking/respond?token=${booking.response_token}&action=cancel`}
              className="text-red-500 hover:underline font-medium"
            >
              Cancel this booking request
            </Link>
          </p>
        )}
      </div>
    </div>
    </>
  );
};

export default BookingConfirmationPage;

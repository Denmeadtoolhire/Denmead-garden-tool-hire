import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Booking, Tool } from '@/lib/supabase';
import { sendApprovalEmail } from '@/lib/email';
import { format, parseISO } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type State =
  | { type: 'loading' }
  | { type: 'accepted'; booking: Booking }
  | { type: 'declined' }
  | { type: 'already_used' }
  | { type: 'not_found' }
  | { type: 'error'; message: string };

const BookingRespondPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const action = searchParams.get('action') as 'accept' | 'decline' | null;

  const [state, setState] = useState<State>({ type: 'loading' });

  useEffect(() => {
    if (!token || (action !== 'accept' && action !== 'decline')) {
      setState({ type: 'not_found' });
      return;
    }
    handleResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResponse = async () => {
    // Look up booking by response_token
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, tools(name, price_4hr, price_1day)')
      .eq('response_token', token)
      .single();

    if (error || !booking) {
      setState({ type: 'not_found' });
      return;
    }

    if (booking.status !== 'alternative_suggested') {
      setState({ type: 'already_used' });
      return;
    }

    if (action === 'accept') {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'approved',
          start_time: booking.suggested_start_time,
          end_time: booking.suggested_end_time,
        })
        .eq('id', booking.id);

      if (updateError) {
        setState({ type: 'error', message: 'Failed to confirm your booking. Please contact us.' });
        return;
      }

      // Fetch updated booking for email
      const { data: updated } = await supabase
        .from('bookings')
        .select('*, tools(name, price_4hr, price_1day)')
        .eq('id', booking.id)
        .single();

      if (updated?.tools) {
        sendApprovalEmail(updated as Booking, { ...updated.tools, id: updated.tool_id } as unknown as Tool);
      }

      setState({ type: 'accepted', booking: updated as Booking });
    } else {
      // decline
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (updateError) {
        setState({ type: 'error', message: 'Failed to cancel your booking. Please contact us.' });
        return;
      }

      setState({ type: 'declined' });
    }
  };

  if (state.type === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">Processing your response...</p>
      </div>
    );
  }

  if (state.type === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-600 mb-6">
            This link is invalid or has expired. Please contact us if you need help.
          </p>
          <Link to="/" className="text-brand-green font-semibold hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (state.type === 'already_used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Already Used</h1>
          <p className="text-gray-600 mb-6">
            This link has already been used. Your booking has already been updated.
          </p>
          <Link to="/" className="text-brand-green font-semibold hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (state.type === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
          <p className="text-gray-600 mb-6">{state.message}</p>
          <a href="tel:07889765153" className="text-brand-green font-semibold hover:underline">
            Call 07889765153
          </a>
        </div>
      </div>
    );
  }

  if (state.type === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <XCircle className="mx-auto text-red-400 mb-4" size={56} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Request Cancelled
          </h1>
          <p className="text-gray-600 mb-6">
            Your booking request has been cancelled. We're sorry we couldn't accommodate your
            preferred time. Please feel free to submit a new request for a different date.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/tools"
              className="bg-brand-green text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-green-dark transition-colors"
            >
              Browse Tools
            </Link>
            <Link
              to="/"
              className="border-2 border-brand-green text-brand-green font-semibold px-6 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // accepted
  const { booking } = state;
  const startDate = booking.start_time ? parseISO(booking.start_time) : null;
  const endDate = booking.end_time ? parseISO(booking.end_time) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full text-center">
        <CheckCircle className="mx-auto text-brand-green mb-4" size={56} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Great! Your Booking is Confirmed
        </h1>
        <p className="text-gray-600 mb-6">
          We've confirmed your booking for the alternative time. A confirmation email has been
          sent to <strong>{booking.customer_email}</strong>.
        </p>

        {startDate && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6 text-left">
            <h2 className="font-bold text-gray-800 mb-3">Booking Details</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium text-gray-900">
                  {format(startDate, 'EEEE d MMMM yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span className="font-medium text-gray-900">
                  {booking.hire_type === '1day'
                    ? 'Full day'
                    : endDate
                    ? `${format(startDate, 'HH:mm')} – ${format(endDate, 'HH:mm')}`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Hire type:</span>
                <span className="font-medium text-gray-900">
                  {booking.hire_type === '4hr' ? '4 Hours' : 'Full Day'}
                </span>
              </div>
            </div>
            <hr className="my-3 border-gray-100" />
            <p className="text-sm text-gray-600">
              <strong>Collection:</strong> 1 Inhams Lane, Denmead, PO7 6LX
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Payment:</strong> Cash or card on collection
            </p>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Link
            to="/tools"
            className="bg-brand-green text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            Browse More Tools
          </Link>
          <Link
            to="/"
            className="border-2 border-brand-green text-brand-green font-semibold px-6 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingRespondPage;

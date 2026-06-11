import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { sendApprovalEmail, sendAlternativeSuggestionEmail } from '@/lib/email';

type BookingWithTool = Booking & { tools: { name: string; price_4hr: number; price_1day: number } | null };
type Tab = 'pending' | 'approved' | 'all';

function statusBadge(status: Booking['status']) {
  switch (status) {
    case 'pending':
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
          Pending
        </span>
      );
    case 'approved':
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
          Approved
        </span>
      );
    case 'alternative_suggested':
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
          Alt. Suggested
        </span>
      );
    case 'cancelled':
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-600">
          Cancelled
        </span>
      );
  }
}

function formatBookingTime(b: BookingWithTool) {
  const start = parseISO(b.start_time);
  const end = parseISO(b.end_time);
  if (b.hire_type === '1day') return 'Full day';
  return `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`;
}

// Generate hourly time options 07:00 – 20:00
const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 20; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
}

const ManageBookings = () => {
  const [bookings, setBookings] = useState<BookingWithTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');

  // Approve state
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Suggest alternative modal
  const [altBooking, setAltBooking] = useState<BookingWithTool | null>(null);
  const [altDate, setAltDate] = useState('');
  const [altStartTime, setAltStartTime] = useState('08:00');
  const [sendingAlt, setSendingAlt] = useState(false);
  const [altError, setAltError] = useState('');

  // Cancel confirm
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Success flash
  const [flash, setFlash] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, tools(name, price_4hr, price_1day)')
      .order('created_at', { ascending: false });
    setBookings((data as BookingWithTool[]) ?? []);
    setLoading(false);
  };

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 4000);
  };

  const handleApprove = async (b: BookingWithTool) => {
    setApprovingId(b.id);
    const { error } = await supabase.from('bookings').update({ status: 'approved' }).eq('id', b.id);
    if (error) {
      showFlash('Error approving booking.');
    } else {
      // Send approval email (non-blocking)
      if (b.tools) {
        sendApprovalEmail(b, { ...b.tools, id: b.tool_id } as any);
      }
      showFlash(`Approved booking for ${b.customer_name}.`);
      await loadBookings();
    }
    setApprovingId(null);
  };

  const handleSendAlternative = async () => {
    if (!altBooking || !altDate || !altStartTime) return;
    setAltError('');
    setSendingAlt(true);

    // Compute suggested start/end
    const suggestedStart = new Date(`${altDate}T${altStartTime}:00`);
    let suggestedEnd: Date;
    if (altBooking.hire_type === '4hr') {
      suggestedEnd = new Date(suggestedStart.getTime() + 4 * 60 * 60 * 1000);
    } else {
      // Full day: reuse the same duration as original
      const origDuration =
        parseISO(altBooking.end_time).getTime() - parseISO(altBooking.start_time).getTime();
      suggestedEnd = new Date(suggestedStart.getTime() + origDuration);
    }

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'alternative_suggested',
        suggested_start_time: suggestedStart.toISOString(),
        suggested_end_time: suggestedEnd.toISOString(),
      })
      .eq('id', altBooking.id);

    if (error) {
      setAltError('Failed to save alternative. Please try again.');
      setSendingAlt(false);
      return;
    }

    // Fetch fresh booking with response_token
    const { data: fresh } = await supabase
      .from('bookings')
      .select('*, tools(name, price_4hr, price_1day)')
      .eq('id', altBooking.id)
      .single();

    if (fresh && fresh.response_token && fresh.tools) {
      const origin = window.location.origin;
      const acceptUrl = `${origin}/booking/respond?token=${fresh.response_token}&action=accept`;
      const declineUrl = `${origin}/booking/respond?token=${fresh.response_token}&action=decline`;
      sendAlternativeSuggestionEmail(
        fresh as BookingWithTool,
        { ...fresh.tools, id: fresh.tool_id } as any,
        suggestedStart.toISOString(),
        suggestedEnd.toISOString(),
        acceptUrl,
        declineUrl
      );
    }

    showFlash(`Alternative suggestion sent to ${altBooking.customer_name}.`);
    setAltBooking(null);
    setAltDate('');
    setAltStartTime('08:00');
    setSendingAlt(false);
    await loadBookings();
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', cancelId);
    setCancelId(null);
    setCancelling(false);
    await loadBookings();
  };

  const pending = bookings.filter((b) => b.status === 'pending' || b.status === 'alternative_suggested');
  const approved = bookings.filter((b) => b.status === 'approved');

  const tabData = tab === 'pending' ? pending : tab === 'approved' ? approved : bookings;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings</h1>

        {/* Flash */}
        {flash && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
            {flash}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {(['pending', 'approved', 'all'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors capitalize ${
                tab === t
                  ? 'bg-white text-brand-green shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'pending' ? 'Pending Requests' : t === 'approved' ? 'Approved' : 'All Bookings'}
              {t === 'pending' && pending.length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Cancel confirm modal */}
        {cancelId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={22} />
                <div>
                  <h3 className="font-bold text-lg">Cancel Booking?</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    This will mark the booking as cancelled. The customer will not be
                    automatically notified.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                </button>
                <button
                  onClick={() => setCancelId(null)}
                  className="flex-1 border border-gray-200 py-2.5 rounded-lg hover:bg-gray-50"
                >
                  Keep
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suggest Alternative modal */}
        {altBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Suggest Alternative Time</h3>
                <button
                  onClick={() => { setAltBooking(null); setAltError(''); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                For <strong>{altBooking.customer_name}</strong> — {altBooking.tools?.name}
                <br />
                Hire type: <strong>{altBooking.hire_type === '4hr' ? '4 Hours' : 'Full Day'}</strong>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={altDate}
                    onChange={(e) => setAltDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <select
                    value={altStartTime}
                    onChange={(e) => setAltStartTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              {altError && (
                <p className="mt-3 text-sm text-red-600">{altError}</p>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSendAlternative}
                  disabled={sendingAlt || !altDate || !altStartTime}
                  className="flex-1 bg-amber-500 text-white font-semibold py-2.5 rounded-lg hover:bg-amber-600 disabled:opacity-60"
                >
                  {sendingAlt ? 'Sending...' : 'Send Suggestion'}
                </button>
                <button
                  onClick={() => { setAltBooking(null); setAltError(''); }}
                  className="flex-1 border border-gray-200 py-2.5 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : tab === 'pending' ? (
          /* Pending requests — card layout */
          <div className="space-y-4">
            {tabData.length === 0 && (
              <div className="bg-white rounded-xl p-10 text-center text-gray-500 border border-gray-100 shadow-sm">
                No pending requests.
              </div>
            )}
            {tabData.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{b.customer_name}</span>
                      {statusBadge(b.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {b.customer_email} &bull; {b.customer_phone}
                    </p>
                    <p className="text-sm font-medium text-gray-800 mt-1">
                      {b.tools?.name ?? '—'} &bull; {b.hire_type === '4hr' ? '4 Hours' : 'Full Day'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(parseISO(b.start_time), 'EEEE d MMMM yyyy')} &bull;{' '}
                      {formatBookingTime(b)}
                    </p>
                    {b.status === 'alternative_suggested' && b.suggested_start_time && (
                      <p className="text-sm text-blue-700 mt-1">
                        <Clock size={12} className="inline mr-1" />
                        Alt suggested: {format(parseISO(b.suggested_start_time), 'EEE d MMM, HH:mm')}
                      </p>
                    )}
                    {b.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">Note: {b.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(b)}
                      disabled={approvingId === b.id}
                      className="flex items-center gap-1.5 bg-brand-green text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60"
                    >
                      <CheckCircle size={14} />
                      {approvingId === b.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => {
                        setAltBooking(b);
                        setAltDate('');
                        setAltStartTime('08:00');
                        setAltError('');
                      }}
                      className="flex items-center gap-1.5 bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      <Clock size={14} />
                      Suggest Alternative
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Approved / All — table layout */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                      Tool
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">
                      Date / Time
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">
                      Phone
                    </th>
                    {tab === 'all' && (
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                    )}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tabData.map((b) => (
                    <tr
                      key={b.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        b.status === 'cancelled' ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{b.customer_name}</p>
                        <p className="text-xs text-gray-500">{b.customer_email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">
                        <p>{b.tools?.name ?? '—'}</p>
                        <p className="text-xs text-gray-500">
                          {b.hire_type === '4hr' ? '4 Hours' : 'Full Day'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 hidden md:table-cell whitespace-nowrap">
                        <p>{format(parseISO(b.start_time), 'dd/MM/yyyy')}</p>
                        <p className="text-xs text-gray-500">{formatBookingTime(b)}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {b.customer_phone}
                      </td>
                      {tab === 'all' && (
                        <td className="px-4 py-3">{statusBadge(b.status)}</td>
                      )}
                      <td className="px-4 py-3">
                        {b.status === 'approved' && (
                          <button
                            onClick={() => setCancelId(b.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tabData.length === 0 && (
                <div className="px-5 py-10 text-center text-gray-500">
                  No bookings in this view.
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Showing {tabData.length} of {bookings.length} total bookings
        </p>
      </div>
    </AdminLayout>
  );
};

export default ManageBookings;

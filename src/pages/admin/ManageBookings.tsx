import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { Booking, BookingItem } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { CheckCircle, Clock, AlertTriangle, X, Phone, MessageCircle, BadgeCheck } from 'lucide-react';
import { sendApprovalEmail, sendAlternativeSuggestionEmail, sendHireCompleteEmail } from '@/lib/email';

type BookingWithDetails = Booking & {
  tools?: { name: string; price_4hr: number; price_1day: number; price_2day: number } | null;
  booking_items?: Array<BookingItem & { tools?: { name: string; price_4hr: number; price_1day: number; price_2day: number } }>;
};
type Tab = 'pending' | 'approved' | 'archived' | 'all';

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

// Helper to get tool names for a booking (handles both single-tool and multi-tool)
function getToolNames(b: BookingWithDetails): string {
  if (b.booking_items && b.booking_items.length > 0) {
    return b.booking_items.map(bi => bi.tools?.name || 'Unknown').join(', ');
  }
  return b.tools?.name ?? '—';
}

function getBookingTotal(b: BookingWithDetails): number {
  if (b.booking_items && b.booking_items.length > 0) {
    return b.booking_items.reduce((sum, bi) => {
      if (bi.price_at_booking) return sum + bi.price_at_booking;
      const t = bi.tools;
      if (!t) return sum;
      return sum + (b.hire_type === '4hr' ? t.price_4hr : b.hire_type === '2day' ? t.price_2day : t.price_1day);
    }, 0);
  }
  if (b.tools) {
    return b.hire_type === '4hr' ? b.tools.price_4hr : b.hire_type === '2day' ? b.tools.price_2day : b.tools.price_1day;
  }
  return 0;
}

const ManageBookings = () => {
  const [searchParams] = useSearchParams();
  const autoApproveId = searchParams.get('approve');
  const autoSuggestId = searchParams.get('suggest');
  const tabParam = searchParams.get('tab') as Tab | null;

  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(tabParam ?? 'pending');

  // Approve state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [clashWarning, setClashWarning] = useState<BookingWithTool | null>(null);
  const [confirmingApprove, setConfirmingApprove] = useState<BookingWithTool | null>(null);

  // Suggest alternative modal
  const [altBooking, setAltBooking] = useState<BookingWithTool | null>(null);
  const [altDate, setAltDate] = useState('');
  const [altStartTime, setAltStartTime] = useState('08:00');
  const [sendingAlt, setSendingAlt] = useState(false);
  const [altError, setAltError] = useState('');

  // Cancel confirm
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success flash
  const [flash, setFlash] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    if (!bookings.length) return;
    if (autoApproveId) {
      const b = bookings.find(x => x.id === autoApproveId);
      if (b) handleApprove(b as BookingWithDetails);
    }
    if (autoSuggestId) {
      const b = bookings.find(x => x.id === autoSuggestId);
      if (b) setAltBooking(b as BookingWithTool);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  const loadBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        tools(name, price_4hr, price_1day, price_2day),
        booking_items(id, tool_id, quantity, price_at_booking, tools(name, price_4hr, price_1day, price_2day))
      `)
      .order('created_at', { ascending: false });
    setBookings((data as BookingWithDetails[]) ?? []);
    setLoading(false);
  };

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 4000);
  };

  const handleApprove = async (b: BookingWithDetails) => {
    setApprovingId(b.id);

    // Get all tool IDs for this booking (multi-tool or single-tool)
    const toolIds = b.booking_items && b.booking_items.length > 0
      ? b.booking_items.map(bi => bi.tool_id)
      : b.tool_id ? [b.tool_id] : [];

    // Check for clashing approved bookings for ANY tool in this booking
    for (const toolId of toolIds) {
      const { data: clashing } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'approved')
        .lt('start_time', b.end_time)
        .gt('end_time', b.start_time)
        .or(`tool_id.eq.${toolId},booking_items.tool_id.eq.${toolId}`);

      if (clashing && clashing.length > 0) {
        setClashWarning(b);
        setConfirmingApprove(b);
        setApprovingId(null);
        return;
      }
    }

    // No clash, proceed with approval
    const { error } = await supabase.from('bookings').update({ status: 'approved' }).eq('id', b.id);
    if (error) {
      showFlash('Error approving booking.');
    } else {
      const approvalToolNames = b.booking_items && b.booking_items.length > 0
        ? b.booking_items.map(bi => bi.tools?.name ?? 'Unknown')
        : b.tools ? [b.tools.name] : ['Unknown'];
      sendApprovalEmail(b, approvalToolNames).catch(console.error);
      showFlash(`Approved booking for ${b.customer_name}.`);
      await loadBookings();
    }
    setApprovingId(null);
  };

  const handleConfirmApproveWithClash = async (b: BookingWithDetails) => {
    setApprovingId(b.id);
    const { error } = await supabase.from('bookings').update({ status: 'approved' }).eq('id', b.id);
    if (error) {
      showFlash('Error approving booking.');
    } else {
      const clashToolNames = b.booking_items && b.booking_items.length > 0
        ? b.booking_items.map(bi => bi.tools?.name ?? 'Unknown')
        : b.tools ? [b.tools.name] : ['Unknown'];
      sendApprovalEmail(b, clashToolNames).catch(console.error);
      showFlash(`⚠️ Approved — this CLASHES with an existing approved booking!`);
      await loadBookings();
    }
    setClashWarning(null);
    setConfirmingApprove(null);
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

    // Fetch fresh booking with response_token (include booking_items for multi-tool bookings)
    const { data: fresh } = await supabase
      .from('bookings')
      .select('*, tools(name, price_4hr, price_1day), booking_items(tool_id, tools(name, price_4hr, price_1day))')
      .eq('id', altBooking.id)
      .single();

    if (fresh && fresh.response_token) {
      const altToolNames = fresh.booking_items && fresh.booking_items.length > 0
        ? fresh.booking_items.map((bi: any) => bi.tools?.name ?? 'Unknown')
        : fresh.tools ? [fresh.tools.name] : ['Unknown'];
      const origin = window.location.origin;
      const acceptUrl = `${origin}/booking/respond?token=${fresh.response_token}&action=accept`;
      const declineUrl = `${origin}/booking/respond?token=${fresh.response_token}&action=decline`;
      sendAlternativeSuggestionEmail(
        fresh as BookingWithTool,
        altToolNames,
        suggestedStart.toISOString(),
        suggestedEnd.toISOString(),
        acceptUrl,
        declineUrl
      ).catch(console.error);
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

  const handleComplete = async (id: string) => {
    await supabase.from('bookings').update({ completed: true }).eq('id', id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, completed: true } : b)));
    showFlash('Booking marked as complete and archived.');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from('bookings').delete().eq('id', deleteId);
    setDeleteId(null);
    setDeleting(false);
    await loadBookings();
  };

  const handleMarkPaid = async (id: string, paid: boolean) => {
    await supabase.from('bookings').update({ paid }).eq('id', id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, paid } : b)));
    if (paid) {
      const b = bookings.find((x) => x.id === id);
      if (b) {
        const toolNames = b.booking_items && b.booking_items.length > 0
          ? b.booking_items.map((bi) => bi.tools?.name ?? 'Unknown')
          : b.tools ? [b.tools.name] : ['Unknown'];
        sendHireCompleteEmail(b, toolNames).catch(console.error);
      }
    }
  };

  const pending = bookings.filter((b) => b.status === 'pending' || b.status === 'alternative_suggested');
  const approved = bookings.filter((b) => b.status === 'approved' && !b.completed);
  const archived = bookings.filter((b) => b.completed);

  const tabData = tab === 'pending' ? pending : tab === 'approved' ? approved : tab === 'archived' ? archived : bookings;

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
        <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {(['pending', 'approved', 'archived', 'all'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors capitalize ${
                tab === t
                  ? 'bg-white text-brand-green shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'pending' ? 'Pending Requests' : t === 'approved' ? 'Approved' : t === 'archived' ? 'Archived' : 'All Bookings'}
              {t === 'pending' && pending.length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
              {t === 'archived' && archived.length > 0 && (
                <span className="ml-2 bg-gray-400 text-white text-xs rounded-full px-1.5 py-0.5">
                  {archived.length}
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

        {/* Clash warning modal */}
        {confirmingApprove && clashWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={22} />
                <div>
                  <h3 className="font-bold text-lg text-red-600">Booking Clash Detected!</h3>
                  <p className="text-gray-600 text-sm mt-2">
                    Approving this booking would <strong>clash with an existing approved booking</strong> for the same tool at the same time.
                  </p>
                  <p className="text-gray-600 text-sm mt-2">
                    Tool(s): <strong>{getToolNames(clashWarning)}</strong><br />
                    Time: <strong>{format(parseISO(clashWarning.start_time), 'dd MMM, HH:mm')} – {format(parseISO(clashWarning.end_time), 'HH:mm')}</strong>
                  </p>
                  <p className="text-gray-600 text-sm mt-2">
                    You can still approve it (if you own multiple units), or <strong>suggest an alternative time</strong> to this customer.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleConfirmApproveWithClash(clashWarning)}
                  disabled={approvingId !== null}
                  className="w-full bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {approvingId ? 'Approving...' : 'Approve Anyway'}
                </button>
                <button
                  onClick={() => {
                    setConfirmingApprove(null);
                    setClashWarning(null);
                  }}
                  className="w-full border border-gray-200 py-2.5 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel & Choose Alternative
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={22} />
                <div>
                  <h3 className="font-bold text-lg">Delete Booking?</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    This will permanently delete the booking request. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setDeleteId(null)}
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
                For <strong>{altBooking.customer_name}</strong> — {getToolNames(altBooking)}
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
                      {b.paid && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                          <BadgeCheck size={12} /> Paid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-sm text-gray-600">{b.customer_email}</span>
                      <a href={`tel:${b.customer_phone}`} className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full transition-colors">
                        <Phone size={11} /> {b.customer_phone}
                      </a>
                      <a href={`https://wa.me/${b.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 hover:bg-green-200 text-green-700 px-2.5 py-1 rounded-full transition-colors">
                        <MessageCircle size={11} /> WhatsApp
                      </a>
                      <a href={`sms:${b.customer_phone}`} className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 hover:bg-blue-200 text-blue-700 px-2.5 py-1 rounded-full transition-colors">
                        💬 SMS
                      </a>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-1">
                      {getToolNames(b)} &bull; {b.hire_type === '4hr' ? '4 Hours' : b.hire_type === '2day' ? '2 Days' : 'Full Day'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(parseISO(b.start_time), 'EEEE d MMMM yyyy')} &bull;{' '}
                      {formatBookingTime(b)}
                    </p>
                    {b.customer_address && (
                      <p className="text-sm text-gray-500 mt-1">📍 {b.customer_address}</p>
                    )}
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
                  <div className="flex flex-wrap gap-2 shrink-0">
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
                    <button
                      onClick={() => handleMarkPaid(b.id, !b.paid)}
                      className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                        b.paid
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <BadgeCheck size={14} />
                      {b.paid ? 'Paid' : 'Mark Paid'}
                    </button>
                    <button
                      onClick={() => setDeleteId(b.id)}
                      className="flex items-center gap-1.5 bg-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <X size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Approved / All — card layout */
          <div className="space-y-4">
            {tabData.length === 0 && (
              <div className="bg-white rounded-xl p-10 text-center text-gray-500 border border-gray-100 shadow-sm">
                No bookings in this view.
              </div>
            )}
            {tabData.map((b) => {
              const total = getBookingTotal(b);
              return (
                <div key={b.id} className={`bg-white rounded-xl border shadow-sm p-5 ${b.status === 'cancelled' ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-lg">{b.customer_name}</span>
                        {statusBadge(b.status)}
                        {b.paid && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                            <BadgeCheck size={12} /> Paid
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{b.customer_email}</p>
                    </div>
                    {total > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">Amount due</p>
                        <p className="text-2xl font-bold text-brand-green">£{total.toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  {/* Details grid */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 mb-3 text-sm">
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-20 shrink-0">Tool</span>
                      <span className="font-medium text-gray-800">{getToolNames(b)}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-20 shrink-0">Hire type</span>
                      <span className="text-gray-700">{b.hire_type === '4hr' ? '4 Hours' : b.hire_type === '2day' ? '2 Days' : 'Full Day'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-20 shrink-0">Date</span>
                      <span className="text-gray-700">{format(parseISO(b.start_time), 'EEE d MMM yyyy')}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-20 shrink-0">Time</span>
                      <span className="text-gray-700">{formatBookingTime(b)}</span>
                    </div>
                    {b.customer_address && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-20 shrink-0">Address</span>
                        <span className="text-gray-700">{b.customer_address}</span>
                      </div>
                    )}
                    {b.notes && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-20 shrink-0">Notes</span>
                        <span className="text-gray-500 italic">{b.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Contact + actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`tel:${b.customer_phone}`} className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-full transition-colors">
                      <Phone size={11} /> {b.customer_phone}
                    </a>
                    <a href={`https://wa.me/${b.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 hover:bg-green-200 text-green-700 px-2.5 py-1.5 rounded-full transition-colors">
                      <MessageCircle size={11} /> WhatsApp
                    </a>
                    <a href={`sms:${b.customer_phone}`} className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 hover:bg-blue-200 text-blue-700 px-2.5 py-1.5 rounded-full transition-colors">
                      💬 SMS
                    </a>
                    {b.status === 'approved' && (
                      <>
                        <button
                          onClick={() => handleMarkPaid(b.id, !b.paid)}
                          className={`ml-auto inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${
                            b.paid
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <BadgeCheck size={14} />
                          {b.paid ? 'Paid' : 'Mark Paid'}
                        </button>
                        {b.paid && (
                          <button
                            onClick={() => handleComplete(b.id)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg bg-brand-green text-white hover:bg-brand-green-dark transition-colors"
                          >
                            <CheckCircle size={14} />
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => setCancelId(b.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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

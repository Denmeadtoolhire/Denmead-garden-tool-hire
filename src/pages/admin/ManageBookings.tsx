import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Search, X, AlertTriangle } from 'lucide-react';

type BookingWithTool = Booking & { tools: { name: string } | null };

const ManageBookings = () => {
  const [bookings, setBookings] = useState<BookingWithTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [filterFrom, filterTo]);

  const loadBookings = async () => {
    setLoading(true);
    let query = supabase
      .from('bookings')
      .select('*, tools(name)')
      .order('start_time', { ascending: false });

    if (filterFrom) {
      query = query.gte('start_time', startOfDay(new Date(filterFrom)).toISOString());
    }
    if (filterTo) {
      query = query.lte('start_time', endOfDay(new Date(filterTo)).toISOString());
    }

    const { data } = await query;
    setBookings((data as BookingWithTool[]) ?? []);
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', cancelId);
    await loadBookings();
    setCancelId(null);
    setCancelling(false);
  };

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.customer_name.toLowerCase().includes(s) ||
      b.customer_email.toLowerCase().includes(s) ||
      b.customer_phone.includes(s) ||
      (b.tools?.name ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, tool..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-sm"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              title="From date"
            />
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              title="To date"
            />
            {(filterFrom || filterTo) && (
              <button
                onClick={() => { setFilterFrom(''); setFilterTo(''); }}
                className="p-2.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"
                title="Clear date filters"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Cancel modal */}
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

        {/* Table */}
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                      Customer
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell whitespace-nowrap">
                      Tool
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell whitespace-nowrap">
                      Date / Time
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell whitespace-nowrap">
                      Contact
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        b.status === 'cancelled' ? 'opacity-60' : ''
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
                        <p className="text-xs text-gray-500">
                          {b.hire_type === '1day'
                            ? 'Full day'
                            : `${format(parseISO(b.start_time), 'HH:mm')}–${format(
                                parseISO(b.end_time),
                                'HH:mm'
                              )}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {b.customer_phone}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            b.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {b.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.status === 'confirmed' && (
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

              {filtered.length === 0 && (
                <div className="px-5 py-10 text-center text-gray-500">
                  {bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your filters.'}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Showing {filtered.length} of {bookings.length} bookings
        </p>
      </div>
    </AdminLayout>
  );
};

export default ManageBookings;

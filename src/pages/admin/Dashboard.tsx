import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { CalendarCheck, Wrench, Clock, XCircle } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Booking } from '@/lib/supabase';

type BookingWithTool = Booking & { tools: { name: string } | null };

const Dashboard = () => {
  const [totalBookings, setTotalBookings] = useState(0);
  const [todayBookings, setTodayBookings] = useState<BookingWithTool[]>([]);
  const [toolCount, setToolCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const today = new Date();
    const [bookingsRes, todayRes, toolsRes, cancelledRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'approved'),
      supabase
        .from('bookings')
        .select('*, tools(name)')
        .eq('status', 'approved')
        .gte('start_time', startOfDay(today).toISOString())
        .lte('start_time', endOfDay(today).toISOString())
        .order('start_time'),
      supabase.from('tools').select('id', { count: 'exact' }).eq('is_available', true),
      supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'cancelled'),
    ]);

    setTotalBookings(bookingsRes.count ?? 0);
    setTodayBookings((todayRes.data as BookingWithTool[]) ?? []);
    setToolCount(toolsRes.count ?? 0);
    setCancelledCount(cancelledRes.count ?? 0);
    setLoading(false);
  };

  const stats = [
    { label: 'Active Bookings', value: totalBookings, icon: CalendarCheck, color: 'text-brand-green', to: '/admin/bookings?tab=approved' },
    { label: "Today's Bookings", value: todayBookings.length, icon: Clock, color: 'text-blue-600', to: '/admin/bookings?tab=approved' },
    { label: 'Available Tools', value: toolCount, icon: Wrench, color: 'text-amber-600', to: '/admin/tools' },
    { label: 'Cancellations', value: cancelledCount, icon: XCircle, color: 'text-red-500', to: '/admin/bookings?tab=all' },
  ];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map(({ label, value, icon: Icon, color, to }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md hover:border-gray-200 transition-all"
                >
                  <Icon className={color} size={24} />
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm text-gray-500">{label}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Today's bookings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">
                  Today's Bookings — {format(new Date(), 'EEEE d MMMM yyyy')}
                </h2>
              </div>

              {todayBookings.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-500">
                  No bookings today.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todayBookings.map((b) => (
                    <div key={b.id} className="px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{b.customer_name}</p>
                        <p className="text-sm text-gray-500">
                          {b.tools?.name} &mdash;{' '}
                          {b.hire_type === '1day'
                            ? 'Full day'
                            : `${format(parseISO(b.start_time), 'HH:mm')} – ${format(
                                parseISO(b.end_time),
                                'HH:mm'
                              )}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{b.customer_phone}</p>
                        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                          {b.hire_type === '4hr' ? '4hr' : 'Full day'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';

type BookingWithTools = Booking & {
  tools: { name: string } | null;
  booking_items: { tools: { name: string } | null }[];
};

const BookingCalendarPage = () => {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [bookings, setBookings] = useState<BookingWithTools[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadBookings();
  }, [viewMonth]);

  const loadBookings = async () => {
    setLoading(true);
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);

    const { data } = await supabase
      .from('bookings')
      .select('*, tools(name), booking_items(tools(name))')
      .in('status', ['approved', 'pending'])
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time');

    setBookings((data as BookingWithTools[]) ?? []);
    setLoading(false);
  };

  const getToolName = (b: BookingWithTools): string => {
    if (b.booking_items?.length > 0) {
      return b.booking_items.map((i) => i.tools?.name ?? '').filter(Boolean).join(', ');
    }
    return b.tools?.name ?? 'Unknown tool';
  };

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(parseISO(b.start_time), day));

  const calStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-brand-green inline-block" />
              Approved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              Pending
            </span>
          </div>
        </div>

        {/* Month nav */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-gray-800 text-lg">
              {format(viewMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-3">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className={`grid grid-cols-7 ${loading ? 'opacity-50' : ''}`}>
            {days.map((day, idx) => {
              const inMonth = isSameMonth(day, viewMonth);
              const dayBookings = getBookingsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-2 border-b border-r border-gray-100 ${
                    idx % 7 === 0 ? 'border-l' : ''
                  } ${!inMonth ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div
                    className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-brand-green text-white'
                        : inMonth
                        ? 'text-gray-800'
                        : 'text-gray-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => navigate(`/admin/bookings?highlight=${b.id}`)}
                        className={`w-full text-left text-xs px-2 py-1 rounded-md font-medium truncate transition-opacity hover:opacity-80 ${
                          b.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                        title={`${b.customer_name} — ${getToolName(b)}`}
                      >
                        {b.customer_name.split(' ')[0]} · {getToolName(b).split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BookingCalendarPage;

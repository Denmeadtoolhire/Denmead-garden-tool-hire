import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { getBookingTotal } from '@/lib/bookingTotal';
import type { PriceableBooking } from '@/lib/bookingTotal';
import { format, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { TrendingUp, CalendarCheck, PoundSterling, XCircle, Wrench } from 'lucide-react';

type ReportBooking = PriceableBooking & {
  id: string;
  status: string;
  start_time: string;
  paid: boolean | null;
};

type Period = '12m' | 'year' | 'all';

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: '12m', label: 'Last 12 months' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

const money = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 });

const toolNamesOf = (b: ReportBooking): string[] => {
  if (b.booking_items && b.booking_items.length > 0) {
    return b.booking_items.map((bi) => bi.tools?.name ?? 'Unknown');
  }
  return b.tools?.name ? [b.tools.name] : [];
};

const ReportsPage = () => {
  const [bookings, setBookings] = useState<ReportBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('12m');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('bookings')
        .select(
          'id, status, start_time, hire_type, paid, tools(name, price_4hr, price_1day, price_2day), booking_items(price_at_booking, tools(name, price_4hr, price_1day, price_2day))'
        )
        .order('start_time', { ascending: false });
      setBookings((data as unknown as ReportBooking[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === '12m') return startOfMonth(subMonths(now, 11));
    if (period === 'year') return new Date(now.getFullYear(), 0, 1);
    return new Date(0);
  }, [period]);

  const inPeriod = useMemo(
    () => bookings.filter((b) => parseISO(b.start_time) >= periodStart),
    [bookings, periodStart]
  );

  // Only approved bookings represent real trade; pending ones may never happen.
  const earned = useMemo(() => inPeriod.filter((b) => b.status === 'approved'), [inPeriod]);
  const cancelled = useMemo(() => inPeriod.filter((b) => b.status === 'cancelled'), [inPeriod]);

  const totalRevenue = useMemo(
    () => earned.reduce((sum, b) => sum + getBookingTotal(b), 0),
    [earned]
  );
  const unpaidRevenue = useMemo(
    () => earned.filter((b) => !b.paid).reduce((sum, b) => sum + getBookingTotal(b), 0),
    [earned]
  );

  const monthly = useMemo(() => {
    const rows = new Map<string, { label: string; count: number; revenue: number }>();
    const now = new Date();
    const months = period === 'all' ? 24 : period === 'year' ? now.getMonth() + 1 : 12;
    for (let i = months - 1; i >= 0; i--) {
      const d = startOfMonth(subMonths(now, i));
      if (d < periodStart) continue;
      rows.set(format(d, 'yyyy-MM'), { label: format(d, 'MMM yyyy'), count: 0, revenue: 0 });
    }
    for (const b of earned) {
      const key = format(parseISO(b.start_time), 'yyyy-MM');
      const row = rows.get(key);
      if (!row) continue;
      row.count += 1;
      row.revenue += getBookingTotal(b);
    }
    return [...rows.values()];
  }, [earned, period, periodStart]);

  const byTool = useMemo(() => {
    const rows = new Map<string, { name: string; count: number; revenue: number }>();
    for (const b of earned) {
      const names = toolNamesOf(b);
      if (names.length === 0) continue;
      // Split a multi-tool booking's value evenly so totals still reconcile.
      const share = getBookingTotal(b) / names.length;
      for (const name of names) {
        const row = rows.get(name) ?? { name, count: 0, revenue: 0 };
        row.count += 1;
        row.revenue += share;
        rows.set(name, row);
      }
    }
    return [...rows.values()].sort((a, b) => b.revenue - a.revenue);
  }, [earned]);

  const thisWeek = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return earned.filter((b) => parseISO(b.start_time) >= weekStart);
  }, [earned]);

  const thisMonth = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    return earned.filter((b) => parseISO(b.start_time) >= monthStart);
  }, [earned]);

  const hireSplit = useMemo(() => {
    const counts = { '4hr': 0, '1day': 0, '2day': 0 } as Record<string, number>;
    for (const b of earned) counts[b.hire_type] = (counts[b.hire_type] ?? 0) + 1;
    return counts;
  }, [earned]);

  const maxRevenue = Math.max(1, ...monthly.map((m) => m.revenue));

  const headline = [
    { label: 'Bookings', value: String(earned.length), icon: CalendarCheck, color: 'text-brand-green' },
    { label: 'Revenue', value: money(totalRevenue), icon: PoundSterling, color: 'text-emerald-600' },
    {
      label: 'Average booking',
      value: earned.length ? money(totalRevenue / earned.length) : money(0),
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    { label: 'Cancelled', value: String(cancelled.length), icon: XCircle, color: 'text-red-500' },
  ];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Approved bookings only — pending and cancelled requests are excluded from revenue.
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Loading reports...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {headline.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <Icon size={18} className={color} />
                  <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700">This week</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {thisWeek.length} booking{thisWeek.length === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-gray-500">
                  {money(thisWeek.reduce((s, b) => s + getBookingTotal(b), 0))}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700">This month</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {thisMonth.length} booking{thisMonth.length === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-gray-500">
                  {money(thisMonth.reduce((s, b) => s + getBookingTotal(b), 0))}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700">Not marked paid</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{money(unpaidRevenue)}</p>
                <p className="text-sm text-gray-500">
                  {hireSplit['4hr']} × 4hr · {hireSplit['1day']} × day · {hireSplit['2day']} × 2 day
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-4">Bookings by month</h2>
              {monthly.every((m) => m.count === 0) ? (
                <p className="text-sm text-gray-400 py-6 text-center">No bookings in this period.</p>
              ) : (
                <div className="space-y-2">
                  {monthly.map((m) => (
                    <div key={m.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">{m.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-brand-green h-full rounded-full transition-all"
                          style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right shrink-0">{m.count}</span>
                      <span className="text-sm font-semibold text-gray-800 w-20 text-right shrink-0">
                        {money(m.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Wrench size={16} className="text-brand-green" />
                Most popular tools
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Multi-tool bookings split their value evenly across the tools hired.
              </p>
              {byTool.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No bookings in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="pb-2 font-medium">Tool</th>
                        <th className="pb-2 font-medium text-right">Times hired</th>
                        <th className="pb-2 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byTool.map((t) => (
                        <tr key={t.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-gray-800">{t.name}</td>
                          <td className="py-2.5 text-right text-gray-600">{t.count}</td>
                          <td className="py-2.5 text-right font-semibold text-gray-900">
                            {money(t.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;

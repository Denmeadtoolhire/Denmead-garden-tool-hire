import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { getDayOpeningTime, getDayClosingTime } from '@/lib/availability';
import { Trash2, CalendarX } from 'lucide-react';

interface BlockedPeriod {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

interface Settings {
  opening_time: string;
  closing_time: string;
  opening_times: Record<string, string>;
  closing_times: Record<string, string>;
}

const BlockedDates = () => {
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    reason: '',
    startDate: '',
    endDate: '',
    type: 'single' as 'single' | 'range',
  });

  const loadData = async () => {
    setLoading(true);
    const [{ data: periods }, { data: settingsData }] = await Promise.all([
      supabase.from('blocked_periods').select('*').order('start_time', { ascending: true }),
      supabase.from('settings').select('opening_time, closing_time, opening_times, closing_times').single(),
    ]);
    setBlockedPeriods(periods ?? []);
    if (settingsData) setSettings(settingsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blocked period?')) return;
    const { error } = await supabase.from('blocked_periods').delete().eq('id', id);
    if (error) {
      alert('Failed to delete: ' + error.message);
    } else {
      setBlockedPeriods((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate) return;
    if (form.type === 'range' && !form.endDate) {
      setError('Please select an end date');
      return;
    }
    if (!settings) {
      setError('Settings not loaded');
      return;
    }
    setSubmitting(true);
    setError(null);

    const startDate = new Date(form.startDate);
    const endDate = form.type === 'range' ? new Date(form.endDate) : startDate;

    if (endDate < startDate) {
      setError('End date must be after start date');
      setSubmitting(false);
      return;
    }

    const startTime = `${form.startDate}T${getDayOpeningTime(settings, startDate)}:00`;
    const endDateStr = form.type === 'range' ? form.endDate : form.startDate;
    const endTime = `${endDateStr}T${getDayClosingTime(settings, endDate)}:00`;

    const { error: insertError } = await supabase.from('blocked_periods').insert({
      start_time: startTime,
      end_time: endTime,
      reason: form.reason || null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setForm({ reason: '', startDate: '', endDate: '', type: 'single' });
      await loadData();
    }
    setSubmitting(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const isMultiDay = (period: BlockedPeriod) => {
    const start = new Date(period.start_time);
    const end = new Date(period.end_time);
    return start.toDateString() !== end.toDateString();
  };

  const formatPeriodLabel = (period: BlockedPeriod) => {
    if (isMultiDay(period)) {
      return `${formatDate(period.start_time)} – ${formatDate(period.end_time)}`;
    }
    return formatDate(period.start_time);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <CalendarX className="text-brand-green" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">Blocked Dates</h1>
        </div>

        {/* Add form */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Block a Period</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Holiday, Staff training"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>

            {/* Type toggle */}
            <div className="flex gap-2">
              {(['single', 'range'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t, endDate: '' })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    form.type === t
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-brand-green'
                  }`}
                >
                  {t === 'single' ? 'Single Day' : 'Date Range'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {form.type === 'range' ? 'Start Date *' : 'Date *'}
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>

              {form.type === 'range' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {form.type === 'range' && form.startDate && form.endDate && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2">
                This will block all bookings from <strong>{form.startDate}</strong> through to <strong>{form.endDate}</strong> inclusive.
              </p>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-green text-white font-bold py-2 px-6 rounded-xl hover:bg-brand-green-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : 'Block Dates'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Existing Blocked Periods</h2>
          </div>
          {loading ? (
            <div className="p-6 text-gray-500 text-center">Loading...</div>
          ) : blockedPeriods.length === 0 ? (
            <div className="p-6 text-gray-500 text-center">No blocked periods set.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="text-left px-6 py-3">Dates</th>
                    <th className="text-left px-6 py-3">Reason</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blockedPeriods.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{formatPeriodLabel(period)}</p>
                        {isMultiDay(period) && (
                          <span className="text-xs text-gray-400">Date range</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{period.reason || <span className="text-gray-400 italic">No reason</span>}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(period.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default BlockedDates;

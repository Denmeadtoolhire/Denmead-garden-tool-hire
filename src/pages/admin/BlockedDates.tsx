import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
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
}

const BlockedDates = () => {
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    reason: '',
    date: '',
    type: 'fullday' as 'fullday' | 'custom',
    startTime: '',
    endTime: '',
    endDate: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [{ data: periods }, { data: settingsData }] = await Promise.all([
      supabase.from('blocked_periods').select('*').order('start_time', { ascending: true }),
      supabase.from('settings').select('opening_time, closing_time').single(),
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
    if (!form.date) return;
    setSubmitting(true);
    setError(null);

    let startTime: string;
    let endTime: string;

    if (form.type === 'fullday') {
      if (!settings) {
        setError('Settings not loaded');
        setSubmitting(false);
        return;
      }
      startTime = `${form.date}T${settings.opening_time}:00`;
      endTime = `${form.date}T${settings.closing_time}:00`;
    } else {
      if (!form.startTime || !form.endTime) {
        setError('Please provide start and end times');
        setSubmitting(false);
        return;
      }
      const endDate = form.endDate || form.date;
      startTime = `${form.date}T${form.startTime}:00`;
      endTime = `${endDate}T${form.endTime}:00`;
    }

    const { error: insertError } = await supabase.from('blocked_periods').insert({
      start_time: startTime,
      end_time: endTime,
      reason: form.reason || null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setForm({ reason: '', date: '', type: 'fullday', startTime: '', endTime: '', endDate: '' });
      await loadData();
    }
    setSubmitting(false);
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'fullday' | 'custom' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                >
                  <option value="fullday">Full Day</option>
                  <option value="custom">Custom Time Range</option>
                </select>
              </div>
            </div>

            {form.type === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date (if different)</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-green text-white font-bold py-2 px-6 rounded-xl hover:bg-brand-green-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : 'Add Blocked Period'}
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
                    <th className="text-left px-6 py-3">Reason</th>
                    <th className="text-left px-6 py-3">Start</th>
                    <th className="text-left px-6 py-3">End</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blockedPeriods.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">{period.reason || <span className="text-gray-400 italic">No reason</span>}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDateTime(period.start_time)}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDateTime(period.end_time)}</td>
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

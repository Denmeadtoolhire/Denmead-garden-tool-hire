import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { Settings } from '@/lib/supabase';
import { Save, Eye, EyeOff } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timeOptions() {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return opts;
}

const TIME_OPTIONS = timeOptions();

const SettingsPage = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        setSettings(data as Settings);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('settings')
      .update({
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        opening_times: settings.opening_times ?? {},
        closing_times: settings.closing_times ?? {},
        open_days: settings.open_days,
        min_notice_hours: settings.min_notice_hours,
        turnaround_minutes: settings.turnaround_minutes ?? 30,
        request_received_email_subject: settings.request_received_email_subject,
        request_received_email_body: settings.request_received_email_body,
        alternative_email_subject: settings.alternative_email_subject,
        alternative_email_body: settings.alternative_email_body,
        confirmation_email_subject: settings.confirmation_email_subject,
        confirmation_email_body: settings.confirmation_email_body,
      })
      .eq('id', 1);

    if (err) {
      setError('Failed to save settings.');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPwMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg('Password must be at least 6 characters.');
      return;
    }

    setPwSaving(true);
    setPwMsg('');
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(newPassword, 10);

    const { error: err } = await supabase
      .from('settings')
      .update({ admin_password_hash: hash })
      .eq('id', 1);

    setPwSaving(false);
    if (err) {
      setPwMsg('Failed to update password.');
    } else {
      setPwMsg('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const toggleDay = (day: number) => {
    if (!settings) return;
    const days = settings.open_days.includes(day)
      ? settings.open_days.filter((d) => d !== day)
      : [...settings.open_days, day].sort();
    setSettings({ ...settings, open_days: days });
  };

  const setDayOpeningTime = (dayIdx: number, time: string) => {
    if (!settings) return;
    const key = dayIdx.toString();
    setSettings({
      ...settings,
      opening_times: { ...(settings.opening_times ?? {}), [key]: time },
    });
  };

  const setDayClosingTime = (dayIdx: number, time: string) => {
    if (!settings) return;
    const key = dayIdx.toString();
    setSettings({
      ...settings,
      closing_times: { ...(settings.closing_times ?? {}), [key]: time },
    });
  };

  if (loading || !settings) {
    return (
      <AdminLayout>
        <p className="text-gray-500">Loading...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Business hours */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-1">Opening Hours</h2>
            <p className="text-xs text-gray-500 mb-4">
              Set default open/close times, then override per day as needed.
            </p>

            {/* Default fallback times */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Opening Time
                </label>
                <select
                  value={settings.opening_time}
                  onChange={(e) =>
                    setSettings({ ...settings, opening_time: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Closing Time
                </label>
                <select
                  value={settings.closing_time}
                  onChange={(e) =>
                    setSettings({ ...settings, closing_time: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Per-day table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Day</th>
                    <th className="text-left px-4 py-2 font-semibold">Status</th>
                    <th className="text-left px-4 py-2 font-semibold">Open</th>
                    <th className="text-left px-4 py-2 font-semibold">Close</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {DAY_NAMES.map((name, idx) => {
                    const isOpen = settings.open_days.includes(idx);
                    const openVal =
                      (settings.opening_times ?? {})[idx.toString()] ||
                      settings.opening_time;
                    const closeVal =
                      (settings.closing_times ?? {})[idx.toString()] ||
                      settings.closing_time;
                    return (
                      <tr
                        key={name}
                        className={isOpen ? '' : 'bg-gray-50 opacity-60'}
                      >
                        <td className="px-4 py-2 font-medium text-gray-800">{name}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => toggleDay(idx)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-colors ${
                              isOpen
                                ? 'border-brand-green bg-brand-green text-white'
                                : 'border-gray-200 text-gray-500 hover:border-brand-green'
                            }`}
                          >
                            {isOpen ? 'Open' : 'Closed'}
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          {isOpen ? (
                            <select
                              value={openVal}
                              onChange={(e) =>
                                setDayOpeningTime(idx, e.target.value)
                              }
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                            >
                              {TIME_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isOpen ? (
                            <select
                              value={closeVal}
                              onChange={(e) =>
                                setDayClosingTime(idx, e.target.value)
                              }
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                            >
                              {TIME_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Notice (hours)
              </label>
              <input
                type="number"
                min={0}
                value={settings.min_notice_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_notice_hours: parseInt(e.target.value) || 0,
                  })
                }
                className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum hours in advance that bookings can be made.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Turnaround Time (minutes)
              </label>
              <input
                type="number"
                min={0}
                step={5}
                value={settings.turnaround_minutes ?? 30}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    turnaround_minutes: parseInt(e.target.value) || 0,
                  })
                }
                className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
              <p className="text-xs text-gray-500 mt-1">
                Gap between a tool being returned and the next booking slot opening up.
              </p>
            </div>
          </div>

          {/* Request Received Email */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Booking Request Received Email</h2>
            <p className="text-sm text-gray-600 mb-4">Sent to customers when they submit a booking request (pending review)</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={settings.request_received_email_subject}
                  onChange={(e) =>
                    setSettings({ ...settings, request_received_email_subject: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Body
                </label>
                <textarea
                  value={settings.request_received_email_body}
                  onChange={(e) =>
                    setSettings({ ...settings, request_received_email_body: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
            </div>
          </div>

          {/* Alternative Suggestion Email */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Alternative Time Suggestion Email</h2>
            <p className="text-sm text-gray-600 mb-4">Sent to customers when you suggest a different date or time for their booking</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={settings.alternative_email_subject ?? ''}
                  onChange={(e) =>
                    setSettings({ ...settings, alternative_email_subject: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Body
                </label>
                <textarea
                  value={settings.alternative_email_body ?? ''}
                  onChange={(e) =>
                    setSettings({ ...settings, alternative_email_body: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
                <p className="text-xs text-gray-400 mt-1">The original requested time and your suggested alternative will be shown automatically below this text, along with Accept and Decline buttons.</p>
              </div>
            </div>
          </div>

          {/* Confirmation Email */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Rental Confirmation Email</h2>
            <p className="text-sm text-gray-600 mb-4">Sent to customers when you approve their booking request</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={settings.confirmation_email_subject}
                  onChange={(e) =>
                    setSettings({ ...settings, confirmation_email_subject: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Body
                </label>
                <textarea
                  value={settings.confirmation_email_body}
                  onChange={(e) =>
                    setSettings({ ...settings, confirmation_email_body: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-green text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>

          {/* Password change */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Change Admin Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-green"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>

              {pwMsg && (
                <p
                  className={`text-sm ${
                    pwMsg.includes('success') ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {pwMsg}
                </p>
              )}

              <button
                onClick={handlePasswordChange}
                disabled={!newPassword || !confirmPassword || pwSaving}
                className="flex items-center gap-2 bg-gray-800 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-60"
              >
                {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;

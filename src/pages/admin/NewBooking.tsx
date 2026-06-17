import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { Tool, Settings } from '@/lib/supabase';
import { sendApprovalEmail } from '@/lib/email';
import { format, addHours } from 'date-fns';
import { PlusCircle, Trash2 } from 'lucide-react';

interface SelectedTool {
  tool: Tool;
  quantity: number;
}

const NewBooking = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedTools, setSelectedTools] = useState<SelectedTool[]>([]);
  const [hireType, setHireType] = useState<'4hr' | '1day'>('4hr');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [toolsRes, settingsRes] = await Promise.all([
        supabase.from('tools').select('*').eq('is_available', true).order('name'),
        supabase.from('settings').select('*').single(),
      ]);
      setTools((toolsRes.data as Tool[]) ?? []);
      if (settingsRes.data) setSettings(settingsRes.data);
    };
    load();
  }, []);

  const addTool = (tool: Tool) => {
    if (selectedTools.find(s => s.tool.id === tool.id)) return;
    setSelectedTools([...selectedTools, { tool, quantity: 1 }]);
  };

  const removeTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter(s => s.tool.id !== toolId));
  };

  const updateQuantity = (toolId: string, qty: number) => {
    setSelectedTools(selectedTools.map(s => s.tool.id === toolId ? { ...s, quantity: qty } : s));
  };

  const total = selectedTools.reduce((sum, s) => {
    const price = hireType === '4hr' ? s.tool.price_4hr : s.tool.price_1day;
    return sum + price * s.quantity;
  }, 0);

  const handleSubmit = async () => {
    if (!selectedTools.length || !date || !startTime || !customer.name || !customer.email || !customer.phone || !settings) {
      setError('Please fill in all required fields and select at least one tool.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const start = new Date(date);
      start.setHours(hours, minutes, 0, 0);

      const end = hireType === '4hr'
        ? addHours(start, 4)
        : (() => {
            const e = new Date(date);
            const [ch, cm] = settings.closing_time.split(':').map(Number);
            e.setHours(ch, cm, 0, 0);
            return e;
          })();

      // Upsert customer
      const { data: existingCustomer } = await supabase
        .from('customers').select('id').eq('email', customer.email).single();

      let customerId: string;
      if (existingCustomer) {
        customerId = existingCustomer.id;
        await supabase.from('customers').update({
          name: customer.name, phone: customer.phone, address: customer.address,
        }).eq('id', customerId);
      } else {
        const { data: newCustomer, error: ce } = await supabase
          .from('customers').insert({
            email: customer.email, name: customer.name,
            phone: customer.phone, address: customer.address,
          }).select().single();
        if (ce) throw ce;
        customerId = newCustomer.id;
      }

      // Create booking directly as approved
      const { data: booking, error: be } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          customer_address: customer.address,
          hire_type: hireType,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: 'approved',
          notes: customer.notes || null,
        })
        .select().single();

      if (be) throw be;

      // Create booking items
      const { error: ie } = await supabase.from('booking_items').insert(
        selectedTools.map(s => ({
          booking_id: booking.id,
          tool_id: s.tool.id,
          quantity: s.quantity,
          price_at_booking: hireType === '4hr' ? s.tool.price_4hr : s.tool.price_1day,
        }))
      );
      if (ie) throw ie;

      // Send confirmation email if requested
      if (sendEmail) {
        sendApprovalEmail(booking, { ...selectedTools[0].tool, id: selectedTools[0].tool.id } as any).catch(console.error);
      }

      setSuccess(`Booking created for ${customer.name} on ${format(start, 'EEEE d MMMM yyyy')} at ${format(start, 'HH:mm')}.`);
      setSelectedTools([]);
      setDate('');
      setStartTime('');
      setCustomer({ name: '', email: '', phone: '', address: '', notes: '' });
    } catch (err: any) {
      console.error(err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Booking</h1>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-6 font-medium">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Tool selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Select Tools</h2>
            <select
              onChange={(e) => {
                const tool = tools.find(t => t.id === e.target.value);
                if (tool) { addTool(tool); e.target.value = ''; }
              }}
              defaultValue=""
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green text-sm mb-4"
            >
              <option value="" disabled>+ Add a tool...</option>
              {tools.filter(t => !selectedTools.find(s => s.tool.id === t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {selectedTools.length > 0 && (
              <div className="space-y-2">
                {selectedTools.map(s => (
                  <div key={s.tool.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="flex-1 font-medium text-sm text-gray-800">{s.tool.name}</span>
                    <span className="text-sm text-gray-500">
                      £{hireType === '4hr' ? Number(s.tool.price_4hr).toFixed(2) : Number(s.tool.price_1day).toFixed(2)} each
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Qty:</label>
                      <input
                        type="number" min={1} value={s.quantity}
                        onChange={e => updateQuantity(s.tool.id, parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                      />
                    </div>
                    <button onClick={() => removeTool(s.tool.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end pt-2 font-bold text-brand-green">
                  Total: £{total.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Hire type & date/time */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Date & Time</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hire Type *</label>
                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                  <button
                    onClick={() => setHireType('4hr')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${hireType === '4hr' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    4 Hours
                  </button>
                  <button
                    onClick={() => setHireType('1day')}
                    className={`flex-1 py-3 text-sm font-bold border-l border-gray-200 transition-colors ${hireType === '1day' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Full Day
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                <input
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Time * {hireType === '1day' && <span className="text-gray-400 font-normal">(opening time used for full day)</span>}
                </label>
                <input
                  type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  placeholder={settings?.opening_time}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green text-sm"
                />
              </div>
            </div>
          </div>

          {/* Customer details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Customer Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input type="text" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                <input type="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <input type="text" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })}
                  rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green text-sm" />
              </div>
            </div>
          </div>

          {/* Options & submit */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <label className="flex items-center gap-3 mb-6 cursor-pointer">
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">Send confirmation email to customer</span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-brand-green text-white font-bold py-4 rounded-xl hover:bg-brand-green-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              {submitting ? 'Creating Booking...' : 'Create Booking'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">Booking will be created as Approved — no review needed.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NewBooking;

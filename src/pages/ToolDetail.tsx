import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Tool, Settings } from '@/lib/supabase';
import BookingCalendar from '@/components/BookingCalendar';
import { getAvailableSlotsFor4hr, isFullDayAvailable, setTimeOnDate } from '@/lib/availability';
import { sendRequestReceivedEmail, sendAdminNewRequestEmail } from '@/lib/email';
import { format } from 'date-fns';
import { Clock, Calendar, Package, CheckCircle, ArrowLeft } from 'lucide-react';

type Step = 'type' | 'date' | 'slot' | 'details' | 'confirm';

interface SlotOption {
  start: Date;
  end: Date;
  label: string;
  available: boolean;
}

const ToolDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tool, setTool] = useState<Tool | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('type');

  const [hireType, setHireType] = useState<'4hr' | '1day' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [fullDayAvailable, setFullDayAvailable] = useState<boolean | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('tools').select('*, categories(*)').eq('id', id).single(),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ]).then(([toolRes, settingsRes]) => {
      setTool(toolRes.data as Tool);
      setSettings(settingsRes.data as Settings);
      setLoading(false);
    });
  }, [id]);

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (!hireType || !settings || !id) return;

    if (hireType === '4hr') {
      setLoadingSlots(true);
      const s = await getAvailableSlotsFor4hr(id, date, settings);
      setSlots(s);
      setLoadingSlots(false);
      setStep('slot');
    } else {
      setLoadingSlots(true);
      const avail = await isFullDayAvailable(id, date, settings);
      setFullDayAvailable(avail);
      setLoadingSlots(false);
      setStep('slot');
    }
  };

  const handleSubmit = async () => {
    if (!tool || !settings || !selectedDate || !hireType) return;
    setSubmitting(true);
    setError('');

    try {
      // Step 1: Check if customer exists, create or update
      const emailTrim = email.trim();
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', emailTrim)
        .single();

      let customerId: string;

      if (existingCustomer) {
        // Update existing customer with new address/phone if different
        customerId = existingCustomer.id;
        await supabase
          .from('customers')
          .update({
            phone: phone.trim() || null,
            address: address.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId);
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            email: emailTrim,
            name: name.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
            marketing_opt_in: marketingOptIn,
          })
          .select()
          .single();

        if (customerError || !newCustomer) {
          setError('Failed to create customer record. Please try again.');
          setSubmitting(false);
          return;
        }

        customerId = newCustomer.id;
      }

      // Step 2: Create booking with customer_id
      let startTime: Date;
      let endTime: Date;

      if (hireType === '4hr' && selectedSlot) {
        startTime = selectedSlot.start;
        endTime = selectedSlot.end;
      } else {
        startTime = setTimeOnDate(selectedDate, settings.opening_time);
        endTime = setTimeOnDate(selectedDate, settings.closing_time);
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          tool_id: tool.id,
          customer_id: customerId,
          customer_name: name.trim(),
          customer_email: emailTrim,
          customer_phone: phone.trim(),
          hire_type: hireType,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: notes.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (bookingError || !booking) {
        setError('Failed to create booking. Please try again.');
        setSubmitting(false);
        return;
      }

      // Step 3: Send emails (non-blocking)
      sendRequestReceivedEmail(booking, tool);
      sendAdminNewRequestEmail(booking, tool);

      navigate('/booking/confirmation', {
        state: {
          booking,
          tool,
          settings,
        },
      });
    } catch (err) {
      console.error('Booking submission error:', err);
      setError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!tool || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Tool not found.
      </div>
    );
  }

  const price = hireType === '4hr' ? tool.price_4hr : tool.price_1day;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-green text-white py-10">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate('/tools')}
            className="flex items-center gap-2 text-green-200 hover:text-white mb-4 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to tools
          </button>
          <h1 className="text-3xl font-bold">{tool.name}</h1>
          {tool.description && <p className="text-green-200 mt-1">{tool.description}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Tool info */}
          <div className="lg:col-span-1">
            {tool.image_url ? (
              <img
                src={tool.image_url}
                alt={tool.name}
                className="w-full h-48 object-contain bg-white p-3 rounded-xl mb-4 border border-gray-100"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-brand-green to-brand-green-light rounded-xl flex items-center justify-center mb-4">
                <Package size={64} className="text-white opacity-40" />
              </div>
            )}

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">Hire Prices</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} /> 4 Hours
                  </span>
                  <span className="font-bold text-brand-green">£{Number(tool.price_4hr).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} /> Full Day
                  </span>
                  <span className="font-bold text-brand-green">£{Number(tool.price_1day).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Booking flow */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Hire type */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4">1. Choose Hire Type</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setHireType('4hr');
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setStep('date');
                  }}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    hireType === '4hr'
                      ? 'border-brand-green bg-green-50 text-brand-green'
                      : 'border-gray-200 hover:border-brand-green'
                  }`}
                >
                  <Clock size={24} className="mx-auto mb-2" />
                  <div className="font-bold">4 Hours</div>
                  <div className="text-sm text-gray-500">£{Number(tool.price_4hr).toFixed(2)}</div>
                </button>
                <button
                  onClick={() => {
                    setHireType('1day');
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setStep('date');
                  }}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    hireType === '1day'
                      ? 'border-brand-green bg-green-50 text-brand-green'
                      : 'border-gray-200 hover:border-brand-green'
                  }`}
                >
                  <Calendar size={24} className="mx-auto mb-2" />
                  <div className="font-bold">Full Day</div>
                  <div className="text-sm text-gray-500">£{Number(tool.price_1day).toFixed(2)}</div>
                </button>
              </div>
            </div>

            {/* Step 2: Date */}
            {hireType && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-bold text-gray-800 mb-4">2. Select Date</h2>
                <BookingCalendar
                  toolId={tool.id}
                  settings={settings}
                  hireType={hireType}
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                />
              </div>
            )}

            {/* Step 3: Slot */}
            {selectedDate && (step === 'slot' || step === 'details' || step === 'confirm') && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-bold text-gray-800 mb-4">3. Select Time</h2>
                {loadingSlots ? (
                  <p className="text-gray-500">Loading slots...</p>
                ) : hireType === '1day' ? (
                  <div>
                    {fullDayAvailable ? (
                      <div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-brand-green font-medium">
                            Full day hire available on{' '}
                            <strong>{format(selectedDate, 'EEEE d MMMM yyyy')}</strong>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {settings.opening_time} – {settings.closing_time}
                          </p>
                        </div>
                        <button
                          onClick={() => setStep('details')}
                          className="bg-brand-green text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-brand-green-dark transition-colors"
                        >
                          Confirm This Date
                        </button>
                      </div>
                    ) : (
                      <p className="text-red-600">
                        Full day hire is not available on this date. Please choose another date.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      Available time slots for {format(selectedDate, 'EEEE d MMMM yyyy')}:
                    </p>
                    {slots.length === 0 ? (
                      <p className="text-gray-500">No slots available on this day.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.start.toISOString()}
                            disabled={!slot.available}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setStep('details');
                            }}
                            className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                              selectedSlot?.start.toISOString() === slot.start.toISOString()
                                ? 'border-brand-green bg-brand-green text-white'
                                : slot.available
                                ? 'border-green-200 text-brand-green hover:bg-green-50'
                                : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {slot.label}
                            {!slot.available && (
                              <span className="block text-xs text-gray-400">Booked</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Customer details */}
            {(step === 'details' || step === 'confirm') &&
              (hireType === '1day' ? fullDayAvailable : selectedSlot) && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 className="font-bold text-gray-800 mb-4">4. Your Details</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="07xxx xxxxxx"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="Your address"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={marketingOptIn}
                          onChange={(e) => setMarketingOptIn(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-green focus:ring-2 focus:ring-brand-green"
                        />
                        Send me special offers and discount announcements
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                        rows={3}
                        placeholder="Any special requirements?"
                      />
                    </div>
                    <button
                      onClick={() => setStep('confirm')}
                      disabled={!name || !email || !phone || !address}
                      className="bg-brand-green text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Review Booking
                    </button>
                  </div>
                </div>
              )}

            {/* Step 5: Confirm */}
            {step === 'confirm' && name && email && phone && address && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-gold">
                <h2 className="font-bold text-gray-800 mb-4">5. Confirm Booking</h2>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tool:</span>
                    <span className="font-medium">{tool.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">
                      {hireType === '1day'
                        ? `${settings.opening_time} – ${settings.closing_time} (Full day)`
                        : selectedSlot?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hire type:</span>
                    <span className="font-medium">
                      {hireType === '4hr' ? '4 Hours' : 'Full Day'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-bold text-brand-green">£{Number(price).toFixed(2)}</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium">{address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Marketing emails:</span>
                    <span className="font-medium">{marketingOptIn ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Submit Booking Request
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  We'll review your request and be in touch to confirm. Payment is taken on collection.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolDetailPage;

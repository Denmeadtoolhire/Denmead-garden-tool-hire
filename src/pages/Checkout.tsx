import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type Booking, type Settings } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { getAvailableSlotsForMultiTools, isFullDayAvailableForMultiTools } from '@/lib/availability';
import { ChevronLeft, AlertCircle } from 'lucide-react';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { state: cartState, dispatch: cartDispatch } = useCart();
  const hireType = cartState.hireType;
  const [stage, setStage] = useState<'datetime' | 'customer' | 'review'>('datetime');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    marketingOptIn: false,
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [availableSlots, setAvailableSlots] = useState<
    Array<{ start: Date; end: Date; label: string; available: boolean }>
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('settings').select('*').single();
      if (data) setSettings(data);
    };
    loadSettings();
  }, []);

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !settings) return;

      setLoadingSlots(true);
      try {
        const date = new Date(selectedDate);
        const toolIds = cartState.items.map((item) => item.tool.id);

        if (hireType === '1day') {
          const available = await isFullDayAvailableForMultiTools(toolIds, date, settings);
          if (available) {
            setAvailableSlots([
              {
                start: date,
                end: date,
                label: `Full day (${settings.opening_time} – ${settings.closing_time})`,
                available: true,
              },
            ]);
          } else {
            setAvailableSlots([]);
          }
        } else {
          const slots = await getAvailableSlotsForMultiTools(toolIds, date, settings);
          setAvailableSlots(slots);
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, hireType, settings, cartState.items]);

  if (cartState.items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <p className="text-gray-600">No items in cart. Redirecting...</p>
      </div>
    );
  }

  const cartTotal =
    hireType && cartState.items.length > 0
      ? cartState.items.reduce((sum, item) => {
          const price =
            hireType === '4hr' ? item.tool.price_4hr : item.tool.price_1day;
          return sum + price * item.quantity;
        }, 0)
      : 0;

  const handleSubmit = async () => {
    if (!hireType || !selectedDate || !selectedTime || !settings) return;

    try {
      setIsSubmitting(true);

      // Parse date and time
      const [hours, minutes] = selectedTime.split(':');
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0);

      let endTime = new Date(startTime);
      if (hireType === '4hr') {
        endTime.setHours(endTime.getHours() + 4);
      } else {
        endTime.setHours(settings.closing_time.split(':')[0], 0, 0);
      }

      // Get or create customer
      let customerId: string;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerData.email)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update customer data
        await supabase
          .from('customers')
          .update({
            name: customerData.name,
            phone: customerData.phone,
            address: customerData.address,
            marketing_opt_in: customerData.marketingOptIn,
          })
          .eq('id', customerId);
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            email: customerData.email,
            name: customerData.name,
            phone: customerData.phone,
            address: customerData.address,
            marketing_opt_in: customerData.marketingOptIn,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_phone: customerData.phone,
          customer_address: customerData.address,
          hire_type: hireType,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'pending',
          notes: customerData.notes || null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking items
      const bookingItems = cartState.items.map((item) => ({
        booking_id: booking.id,
        tool_id: item.tool.id,
        quantity: item.quantity,
        price_at_booking:
          hireType === '4hr' ? item.tool.price_4hr : item.tool.price_1day,
      }));

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItems);

      if (itemsError) throw itemsError;

      // Clear cart and redirect
      cartDispatch({ type: 'CLEAR_CART' });
      navigate('/booking/confirmation', {
        state: { bookingId: booking.id },
      });
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <button
          onClick={() => {
            if (stage === 'datetime') {
              navigate('/booking/cart');
            } else {
              setStage(
                stage === 'customer' ? 'datetime' : 'customer'
              );
            }
          }}
          className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors shrink-0"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Checkout</h1>
      </div>

      {/* Hire type summary banner */}
      <div className="bg-green-50 border border-brand-green rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
        <span className="text-brand-green font-semibold text-sm">
          Hire period: <strong>{hireType === '4hr' ? '4 Hours' : 'Full Day'}</strong>
          {' · '}Total: <strong>£{cartTotal.toFixed(2)}</strong>
        </span>
        <button
          onClick={() => navigate('/booking/cart')}
          className="text-xs text-brand-green underline font-medium"
        >
          Change
        </button>
      </div>

      {/* Stage 1: Date & Time */}
      {stage === 'datetime' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Select Date & Time
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Time slots display */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Available Times
                  </label>

                  {loadingSlots ? (
                    <div className="text-center py-4 text-gray-500">
                      Checking availability...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-semibold text-amber-900">No availability</p>
                        <p className="text-sm text-amber-800 mt-1">
                          {hireType === '4hr'
                            ? 'No 4-hour slots available for all selected tools on this date.'
                            : 'Full-day hire not available for all selected tools on this date.'}
                        </p>
                        <p className="text-sm text-amber-800 mt-1">Try another date or remove some items from your cart.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {availableSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const slotTime = `${slot.start.getHours().toString().padStart(2, '0')}:${slot.start
                              .getMinutes()
                              .toString()
                              .padStart(2, '0')}`;
                            setSelectedTime(slotTime);
                          }}
                          disabled={!slot.available}
                          className={`py-3 px-2 rounded-lg font-medium text-xs sm:text-sm transition-colors min-h-12 flex items-center justify-center ${
                            slot.available
                              ? selectedTime ===
                                `${slot.start.getHours().toString().padStart(2, '0')}:${slot.start
                                  .getMinutes()
                                  .toString()
                                  .padStart(2, '0')}`
                                ? 'bg-brand-green text-white'
                                : 'bg-green-50 text-brand-green hover:bg-green-100 border border-brand-green'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {hireType === '1day' ? 'Full Day' : slot.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setStage('customer')}
              disabled={!selectedDate || !selectedTime || availableSlots.length === 0}
              className="w-full mt-6 bg-brand-green text-white font-bold py-4 px-4 rounded-xl hover:bg-brand-green-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Stage 3: Customer Details */}
      {stage === 'customer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Your Details
            </h2>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerData.name}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={customerData.email}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={customerData.phone}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  value={customerData.address}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, address: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={customerData.notes}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                />
              </div>

              <label className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={customerData.marketingOptIn}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      marketingOptIn: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  I'd like to receive special offers and updates
                </span>
              </label>
            </form>

            <button
              onClick={() => setStage('review')}
              disabled={!customerData.name || !customerData.email || !customerData.phone || !customerData.address}
              className="w-full mt-6 bg-brand-green text-white font-bold py-4 px-4 rounded-xl hover:bg-brand-green-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
            >
              Review Order
            </button>
          </div>
        </div>
      )}

      {/* Stage 4: Review */}
      {stage === 'review' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review Your Order</h2>

            {/* Items */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">Items</h3>
              {cartState.items.map((item) => (
                <div key={item.tool.id} className="flex justify-between text-gray-600 mb-2">
                  <span>
                    {item.tool.name} x{item.quantity}
                  </span>
                  <span>
                    £{(
                      (hireType === '4hr' ? item.tool.price_4hr : item.tool.price_1day) *
                      item.quantity
                    ).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="mb-6 pb-6 border-b border-gray-200 space-y-3">
              <div>
                <span className="text-gray-600">Hire Type:</span>
                <span className="font-semibold text-gray-900 ml-2">
                  {hireType === '4hr' ? '4 Hours' : 'Full Day'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-semibold text-gray-900 ml-2">
                  {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="font-semibold text-gray-900 ml-2">{customerData.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold text-gray-900 ml-2">{customerData.email}</span>
              </div>
            </div>

            {/* Total */}
            <div className="mb-6 flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-brand-green">£{cartTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-brand-green text-white font-bold py-4 px-4 rounded-xl hover:bg-brand-green-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {isSubmitting ? 'Creating Booking...' : 'Confirm & Request Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;

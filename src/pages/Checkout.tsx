import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type Booking, type Settings } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { getAvailableSlotsForMultiTools, isFullDayAvailableForMultiTools } from '@/lib/availability';
import { sendRequestReceivedEmail, sendAdminNewRequestEmail } from '@/lib/email';
import { ChevronLeft, AlertCircle, X } from 'lucide-react';

const TERMS_AND_CONDITIONS = `Denmead Tool and Garden Hire Ltd - Terms and Conditions

1. Rental Agreement: The following terms and conditions constitute a legally binding rental agreement between the customer ("Renter") and Denmead Tool and Garden Hire Ltd ("Company").

2. Rental Period: The rental period begins on the specified start date and ends on the agreed-upon return date. Any extension must be approved by the Company in advance.

3. Rates and Payment: Renter agrees to pay the rental rate as specified in the agreement. Additional fees may apply for late returns, damages, or other specified conditions.

4. Security Deposit: A security deposit is required before the commencement of the rental period if the value of said tool exceeds £200. The deposit will be refunded upon the satisfactory return of the tools in its original condition.

5. Tool Condition, Damage or Loss: Renter acknowledges receiving the tools in good condition. Any damage or excessive wear during the rental period is the responsibility of the Renter. Any necessary repairs or cleaning of tools may result in a charge to the Renter. In respect of any Hire Goods which are lost, stolen or damaged beyond economic repair during the Hire Period the Customer will: 5.1 for any Hire Goods less than twelve (12) months old from first registration pay to the Company the new replacement cost of the Hire Goods; and/or 5.2 for any Hire Goods more than twelve (12) months old from first registration, pay for the reasonable cost to replace the Hire Goods, as stipulated by the Company.

6. Tool Usage and Safety: Renter agrees to use the tools only for their intended purpose and in accordance with safety guidelines provided by the Company.

7. Liability: The Renter assumes all liability for injuries, damages, or losses incurred during the use of the rented tools. The Company is not liable for any consequential damages.

8. Insurance: Optional insurance coverage is available for an additional fee. Details of coverage and associated costs can be provided upon request.

9. Reservation and Cancellation: Reservations are subject to availability. Cancellation fees may apply if the reservation is canceled less than 1 hour before the agreed-upon start date.

10. Customer Responsibilities: Renter is responsible for the proper transportation, storage, and use of the tools. Any misuse or negligence may result in additional charges.

11. Return Procedure: Tools must be returned on or before the agreed-upon return date in the condition it was given. Late returns may incur additional charges.

12. Termination of Agreement: The Company reserves the right to terminate the agreement in the event of a breach of terms. Renter must return the tools immediately upon termination.

13. Dispute Resolution: Any disputes arising from this agreement will be resolved through UK courts in accordance with the laws of the UK.

14. Governing Law: This agreement is governed by the laws of the UK. Any legal action must be initiated in the appropriate courts of the UK.

15. Customer Acknowledgment: By accepting this agreement, the Renter acknowledges that they have read, understood, and agreed to abide by these terms and conditions.

Denmead Tool and Garden Hire Ltd, 1 Inhams Lane, Denmead, PO7 6LX. Tel: 07889765153`;

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
  const [tcAccepted, setTcAccepted] = useState(false);
  const [tcModalOpen, setTcModalOpen] = useState(false);

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

      // Send emails (fire and forget — don't block navigation on email failure)
      const firstTool = cartState.items[0].tool;
      sendRequestReceivedEmail(booking as Booking, firstTool).catch(console.error);
      sendAdminNewRequestEmail(booking as Booking, firstTool).catch(console.error);

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
              <span>Total: <span className="text-sm font-normal text-gray-500">(Payment at pickup)</span></span>
              <span className="text-brand-green">£{cartTotal.toFixed(2)}</span>
            </div>

            {/* T&Cs checkbox */}
            <label className="flex items-start gap-3 py-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={tcAccepted}
                onChange={(e) => setTcAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 shrink-0"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setTcModalOpen(true)}
                  className="text-brand-green underline font-medium hover:text-brand-green-dark"
                >
                  Terms and Conditions
                </button>
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !tcAccepted}
              className="w-full bg-brand-green text-white font-bold py-4 px-4 rounded-xl hover:bg-brand-green-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {isSubmitting ? 'Creating Booking...' : 'Send Booking Request'}
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Your booking request will be reviewed and a confirmation email will be sent to confirm your booking.
            </p>
          </div>
        </div>
      )}

      {/* T&Cs Modal */}
      {tcModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Terms and Conditions</h2>
              <button
                onClick={() => setTcModalOpen(false)}
                className="text-gray-500 hover:text-gray-800 transition-colors"
              >
                <X size={22} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {TERMS_AND_CONDITIONS}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setTcModalOpen(false)}
                className="w-full bg-brand-green text-white font-bold py-3 px-4 rounded-xl hover:bg-brand-green-dark transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;

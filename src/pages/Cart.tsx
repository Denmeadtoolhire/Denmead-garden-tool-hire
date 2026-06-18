import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, Clock, Calendar, PlusCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { format, parseISO } from 'date-fns';

const CartPage = () => {
  const { state, dispatch } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const initialDate = (location.state as any)?.initialDate ?? '';
  const initialTime = (location.state as any)?.initialTime ?? '';

  if (state.items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
            <ShoppingCart size={48} className="text-gray-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Your cart is empty</h1>
        <p className="text-gray-500 text-lg mb-8">Start by browsing our tools and adding them to your cart.</p>
        <Link
          to="/tools"
          className="inline-block bg-brand-green text-white font-bold px-8 py-4 rounded-xl hover:bg-brand-green-dark transition-colors"
        >
          Browse Tools
        </Link>
      </div>
    );
  }

  const getPrice = (tool: typeof state.items[0]['tool']) =>
    state.hireType === '4hr' ? tool.price_4hr : state.hireType === '2day' ? tool.price_2day : tool.price_1day;

  const total = state.items.reduce((sum, item) => sum + getPrice(item.tool) * item.quantity, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-2">Your Booking</h1>
      <p className="text-gray-500 mb-6">
        Review your tools below. Need to add more?{' '}
        <Link to="/tools" className="text-brand-green font-semibold hover:underline">
          Go back to browse more tools
        </Link>
        .
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-4">
            {state.items.map((item) => (
              <div
                key={item.tool.id}
                className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                  {item.tool.image_url ? (
                    <img src={item.tool.image_url} alt={item.tool.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-green to-brand-green-light flex items-center justify-center">
                      <ShoppingCart size={28} className="text-white opacity-40" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.tool.name}</h3>
                  <p className="text-gray-500 text-sm">
                    £{Number(getPrice(item.tool)).toFixed(2)}{' '}
                    per {state.hireType === '4hr' ? '4hr' : state.hireType === '2day' ? '2 days' : 'full day'}
                  </p>
                </div>

                <div className="text-center sm:text-right flex flex-col items-center sm:items-end justify-between">
                  <p className="text-xl font-bold text-brand-green mb-2">
                    £{Number(getPrice(item.tool)).toFixed(2)}
                  </p>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_ITEM', toolId: item.tool.id })}
                    className="w-10 h-10 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                    title="Remove"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add more tools prompt */}
          <Link
            to="/tools"
            className="flex items-center gap-2 text-brand-green font-semibold hover:underline"
          >
            <PlusCircle size={18} />
            Need more tools? Click here to add another
          </Link>
        </div>

        {/* Order summary */}
        <div className="order-1 lg:order-2">
          <div className="bg-white rounded-2xl shadow-md p-6 sticky top-20 lg:top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

            {/* Hire type — read-only, set in the availability modal */}
            <div className="mb-5 pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">Hire Type</p>
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                {state.hireType === '4hr' ? <><Clock size={14} /> 4 Hours</> : state.hireType === '2day' ? <><Calendar size={14} /> 2 Days</> : <><Calendar size={14} /> Full Day</>}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                To change hire type,{' '}
                <Link to="/tools" className="text-brand-green underline">go back to browse tools</Link>.
              </p>
            </div>

            {/* Selected date & time */}
            {initialDate && initialTime && (
              <div className="mb-5 pb-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1">Selected Date &amp; Time</p>
                <p className="text-sm font-bold text-gray-900">
                  {format(parseISO(initialDate), 'EEEE d MMMM yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {state.hireType === '4hr' ? initialTime : `From ${initialTime} (${state.hireType === '2day' ? '2 days' : 'full day'})`}
                </p>
              </div>
            )}

            <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
              {state.items.map((item) => {
                const price = getPrice(item.tool);
                return (
                  <div key={item.tool.id} className="flex justify-between text-sm text-gray-600">
                    <span className="truncate mr-2">{item.tool.name}</span>
                    <span className="font-medium shrink-0">£{Number(price).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
                <span>Total</span>
                <span className="text-brand-green">£{total.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4 text-center">
              Payment by cash or card on collection — no payment needed now.
            </p>

            <button
              onClick={() => navigate('/booking/checkout', { state: { initialDate, initialTime } })}
              className="block w-full bg-brand-green text-white font-bold py-4 px-4 rounded-xl text-center hover:bg-brand-green-dark transition-colors text-lg"
            >
              Continue to Booking Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

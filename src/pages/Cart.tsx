import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const CartPage = () => {
  const { state, dispatch } = useCart();

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

  const total = state.items.reduce((sum, item) => sum + (item.tool.price_4hr * item.quantity), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-6 md:mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {state.items.map((item) => (
              <div
                key={item.tool.id}
                className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {/* Tool image */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                  {item.tool.image_url ? (
                    <img
                      src={item.tool.image_url}
                      alt={item.tool.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-green to-brand-green-light flex items-center justify-center">
                      <ShoppingCart size={28} className="text-white opacity-40" />
                    </div>
                  )}
                </div>

                {/* Tool details */}
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.tool.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">£{Number(item.tool.price_4hr).toFixed(2)} per 4hr</p>

                  {/* Quantity controls */}
                  <div className="flex items-center justify-center sm:justify-start gap-4">
                    <button
                      onClick={() =>
                        dispatch({
                          type: 'UPDATE_QUANTITY',
                          toolId: item.tool.id,
                          quantity: item.quantity - 1,
                        })
                      }
                      disabled={item.quantity <= 1}
                      className="w-10 h-10 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      <Minus size={18} className="text-gray-600" />
                    </button>
                    <span className="font-semibold w-8 text-center text-lg">{item.quantity}</span>
                    <button
                      onClick={() =>
                        dispatch({
                          type: 'UPDATE_QUANTITY',
                          toolId: item.tool.id,
                          quantity: item.quantity + 1,
                        })
                      }
                      className="w-10 h-10 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      <Plus size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Price and remove */}
                <div className="text-center sm:text-right flex flex-col items-center sm:items-end justify-between">
                  <p className="text-xl font-bold text-brand-green mb-2">
                    £{(Number(item.tool.price_4hr) * item.quantity).toFixed(2)}
                  </p>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_ITEM', toolId: item.tool.id })}
                    className="w-10 h-10 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Continue shopping */}
          <Link
            to="/tools"
            className="text-brand-green font-semibold hover:underline mt-4 inline-block"
          >
            ← Continue Shopping
          </Link>
        </div>

        {/* Order summary */}
        <div className="order-1 lg:order-2">
          <div className="bg-white rounded-2xl shadow-md p-6 sticky top-20 lg:top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between text-gray-600">
                <span>{state.items.length} item(s)</span>
                <span className="font-semibold">
                  £{total.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Select your hire period (4-hour or full-day) at checkout
            </p>

            <Link
              to="/booking/checkout"
              disabled={state.items.length === 0}
              className="block w-full bg-brand-green text-white font-bold py-3 px-4 rounded-xl text-center hover:bg-brand-green-dark transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

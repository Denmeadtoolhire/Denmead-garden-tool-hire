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
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {state.items.map((item) => (
              <div
                key={item.tool.id}
                className="flex gap-4 p-6 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {/* Tool image */}
                <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {item.tool.image_url ? (
                    <img
                      src={item.tool.image_url}
                      alt={item.tool.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-green to-brand-green-light flex items-center justify-center">
                      <ShoppingCart size={32} className="text-white opacity-40" />
                    </div>
                  )}
                </div>

                {/* Tool details */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.tool.name}</h3>
                  <p className="text-gray-500 text-sm mb-3">£{Number(item.tool.price_4hr).toFixed(2)} per 4hr</p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        dispatch({
                          type: 'UPDATE_QUANTITY',
                          toolId: item.tool.id,
                          quantity: item.quantity - 1,
                        })
                      }
                      disabled={item.quantity <= 1}
                      className="p-1 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={16} className="text-gray-600" />
                    </button>
                    <span className="font-semibold w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        dispatch({
                          type: 'UPDATE_QUANTITY',
                          toolId: item.tool.id,
                          quantity: item.quantity + 1,
                        })
                      }
                      className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Plus size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Price and remove */}
                <div className="text-right">
                  <p className="text-xl font-bold text-brand-green mb-4">
                    £{(Number(item.tool.price_4hr) * item.quantity).toFixed(2)}
                  </p>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_ITEM', toolId: item.tool.id })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24">
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

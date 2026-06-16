import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const FloatingCartButton = () => {
  const { state } = useCart();
  const itemCount = state.items.length;

  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-50">
      <div className="max-w-6xl mx-auto px-4 pb-4">
        <Link
          to="/booking/cart"
          className="pulse-button flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-dark text-white font-bold py-4 px-6 rounded-2xl shadow-2xl transition-colors pointer-events-auto w-full sm:w-auto sm:ml-auto block"
        >
          <ShoppingCart size={20} />
          <span>Complete Booking ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        </Link>
      </div>
    </div>
  );
};

export default FloatingCartButton;

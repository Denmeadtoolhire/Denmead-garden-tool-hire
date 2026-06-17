import React, { useState } from 'react';
import { Clock, Calendar, Package, ShoppingCart, Check, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { Tool, Settings } from '@/lib/supabase';
import BookingCalendar from '@/components/BookingCalendar';

interface ToolCardProps {
  tool: Tool;
  categoryName?: string;
  settings?: Settings | null;
}

const ToolCard = ({ tool, categoryName, settings }: ToolCardProps) => {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedHireType, setSelectedHireType] = useState<'4hr' | '1day' | null>(null);
  const [showDurationError, setShowDurationError] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [calHireType, setCalHireType] = useState<'4hr' | '1day'>('4hr');

  const handleAddToCart = () => {
    if (!selectedHireType) {
      setShowDurationError(true);
      setTimeout(() => setShowDurationError(false), 3000);
      return;
    }
    dispatch({ type: 'SET_HIRE_TYPE', hireType: selectedHireType });
    dispatch({ type: 'ADD_ITEM', tool });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <>
      <div className="card-hover bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Image */}
        <div className="relative">
          {tool.image_url ? (
            <img
              src={tool.image_url}
              alt={tool.name}
              className="w-full h-52 object-contain bg-white p-4"
            />
          ) : (
            <div className="w-full h-52 bg-gradient-to-br from-brand-green to-brand-green-light flex items-center justify-center">
              <Package size={64} className="text-white opacity-40" />
            </div>
          )}
          {categoryName && (
            <span className="absolute top-3 left-3 text-xs font-semibold text-white bg-brand-green px-2.5 py-1 rounded-full shadow-sm">
              {categoryName}
            </span>
          )}
          {!tool.is_available && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
              <span className="bg-white text-gray-700 font-bold text-sm px-4 py-2 rounded-full">
                Currently Unavailable
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1 leading-snug">{tool.name}</h3>

          {tool.description && (
            <p className="text-gray-500 text-sm mb-4 line-clamp-3 leading-relaxed">{tool.description}</p>
          )}

          {/* Hire type selector */}
          <div className="mt-auto mb-3">
            <p className={`text-xs font-bold text-center mb-2 ${showDurationError ? 'text-red-600' : 'text-gray-600'}`}>
              {showDurationError ? '⚠ Please select a duration first' : 'Select Duration'}
            </p>
            <div className={`flex rounded-xl overflow-hidden border ${showDurationError ? 'border-red-400' : 'border-gray-200'}`}>
              <button
                onClick={() => { setSelectedHireType('4hr'); setShowDurationError(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors ${
                  selectedHireType === '4hr' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock size={13} />
                4hr — £{Number(tool.price_4hr).toFixed(2)}
              </button>
              <button
                onClick={() => { setSelectedHireType('1day'); setShowDurationError(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors border-l border-gray-200 ${
                  selectedHireType === '1day' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar size={13} />
                Day — £{Number(tool.price_1day).toFixed(2)}
              </button>
            </div>
          </div>

          {tool.is_available ? (
            <div className="space-y-2">
              <button
                onClick={handleAddToCart}
                className={`flex items-center justify-center gap-2 w-full font-bold py-3 px-4 rounded-xl transition-colors ${
                  addedToCart ? 'bg-green-100 text-brand-green' : 'bg-brand-green text-white hover:bg-brand-green-dark'
                }`}
              >
                {addedToCart ? <><Check size={16} />Added to Booking</> : <><ShoppingCart size={16} />Add to Booking</>}
              </button>
              {settings && (
                <button
                  onClick={() => setShowAvailability(true)}
                  className="flex items-center justify-center gap-2 w-full font-semibold py-2.5 px-4 rounded-xl border-2 border-brand-green text-brand-green hover:bg-green-50 transition-colors text-sm"
                >
                  <Calendar size={15} />
                  Quick View Availability
                </button>
              )}
            </div>
          ) : (
            <button disabled className="w-full text-center bg-gray-100 text-gray-400 font-semibold py-3 px-4 rounded-xl cursor-not-allowed">
              Unavailable
            </button>
          )}
        </div>
      </div>

      {/* Availability modal */}
      {showAvailability && settings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowAvailability(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAvailability(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h2 className="font-bold text-gray-900 text-lg mb-1">{tool.name}</h2>
            <p className="text-sm text-gray-500 mb-4">Availability for the next 4 weeks</p>

            {/* Hire type toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
              <button
                onClick={() => setCalHireType('4hr')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold transition-colors ${
                  calHireType === '4hr' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock size={14} /> 4 Hours
              </button>
              <button
                onClick={() => setCalHireType('1day')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors ${
                  calHireType === '1day' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar size={14} /> Full Day
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">Tap a green date to book it</p>
            <BookingCalendar
              toolId={tool.id}
              settings={settings}
              hireType={calHireType}
              selectedDate={null}
              onSelectDate={(date) => {
                dispatch({ type: 'SET_HIRE_TYPE', hireType: calHireType });
                dispatch({ type: 'ADD_ITEM', tool });
                setShowAvailability(false);
                navigate('/booking/checkout', { state: { initialDate: format(date, 'yyyy-MM-dd') } });
              }}
              weeksAhead={4}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ToolCard;

import React, { useState } from 'react';
import { Clock, Calendar, Package, X } from 'lucide-react';
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
  const { dispatch } = useCart();
  const navigate = useNavigate();
  const [showAvailability, setShowAvailability] = useState(false);
  const [calHireType, setCalHireType] = useState<'4hr' | '1day' | null>(null);

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

          {/* Prices */}
          <div className="mt-auto mb-4 flex gap-4">
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Clock size={13} />
              4hr — <strong className="text-brand-green">£{Number(tool.price_4hr).toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar size={13} />
              Full day — <strong className="text-brand-green">£{Number(tool.price_1day).toFixed(2)}</strong>
            </span>
          </div>

          {tool.is_available ? (
            <button
              onClick={() => { setCalHireType(null); setShowAvailability(true); }}
              className="flex items-center justify-center gap-2 w-full font-bold py-3 px-4 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors"
            >
              <Calendar size={16} />
              Check Availability &amp; Book
            </button>
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
            <p className="text-sm text-gray-500 mb-4">Check availability and book</p>

            {/* Step 1: Hire type — must be selected first */}
            <p className={`text-xs font-semibold mb-2 ${calHireType ? 'text-gray-500' : 'text-brand-green'}`}>
              Step 1 — Select hire type
            </p>
            <div className={`flex rounded-xl overflow-hidden border mb-5 ${!calHireType ? 'border-brand-green ring-2 ring-brand-green ring-opacity-30' : 'border-gray-200'}`}>
              <button
                onClick={() => setCalHireType('4hr')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-colors ${
                  calHireType === '4hr' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock size={14} /> 4 Hours — £{Number(tool.price_4hr).toFixed(2)}
              </button>
              <button
                onClick={() => setCalHireType('1day')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold border-l border-gray-200 transition-colors ${
                  calHireType === '1day' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar size={14} /> Full Day — £{Number(tool.price_1day).toFixed(2)}
              </button>
            </div>

            {/* Step 2: Calendar — only shown after hire type selected */}
            {calHireType ? (
              <>
                <p className="text-xs font-semibold text-gray-500 mb-2">Step 2 — Pick a date</p>
                <p className="text-xs text-gray-400 mb-3">Tap a green date to book it</p>
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
              </>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
                Select a hire type above to see availability
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ToolCard;

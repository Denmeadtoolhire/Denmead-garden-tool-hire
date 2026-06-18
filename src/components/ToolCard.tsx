import React, { useState } from 'react';
import { Clock, Calendar, Package, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { Tool, Settings } from '@/lib/supabase';
import BookingCalendar from '@/components/BookingCalendar';
import { getAvailableSlotsFor4hr, getDayOpeningTime, setTimeOnDate } from '@/lib/availability';

interface ToolCardProps {
  tool: Tool;
  categoryName?: string;
  settings?: Settings | null;
}

const ToolCard = ({ tool, categoryName, settings }: ToolCardProps) => {
  const { dispatch } = useCart();
  const navigate = useNavigate();
  const [showAvailability, setShowAvailability] = useState(false);
  const [calHireType, setCalHireType] = useState<'4hr' | '1day' | '2day' | null>(null);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<Array<{ start: Date; end: Date; label: string; available: boolean }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const handleDatePicked = async (date: Date) => {
    if (!settings || !calHireType) return;
    if (calHireType === '1day' || calHireType === '2day') {
      // Full day / 2 day — no time slot selection needed, proceed immediately
      const openTime = getDayOpeningTime(settings, date);
      const openDate = setTimeOnDate(date, openTime);
      const initialTime = format(openDate, 'HH:mm');
      dispatch({ type: 'SET_HIRE_TYPE', hireType: calHireType });
      dispatch({ type: 'ADD_ITEM', tool });
      setShowAvailability(false);
      navigate('/booking/cart', { state: { initialDate: format(date, 'yyyy-MM-dd'), initialTime } });
    } else {
      // 4hr — load time slots for this date
      setPickedDate(date);
      setLoadingSlots(true);
      const slots = await getAvailableSlotsFor4hr(tool.id, date, settings);
      setTimeSlots(slots);
      setLoadingSlots(false);
    }
  };

  const handleTimeSlotPicked = (slot: { start: Date }) => {
    if (!pickedDate || !calHireType) return;
    const initialTime = format(slot.start, 'HH:mm');
    dispatch({ type: 'SET_HIRE_TYPE', hireType: '4hr' });
    dispatch({ type: 'ADD_ITEM', tool });
    setShowAvailability(false);
    navigate('/booking/cart', { state: { initialDate: format(pickedDate, 'yyyy-MM-dd'), initialTime } });
  };

  const resetModal = () => {
    setCalHireType(null);
    setPickedDate(null);
    setTimeSlots([]);
    setShowAvailability(false);
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

          {/* Prices */}
          <div className="mt-auto mb-4 flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Clock size={13} />
              4hr — <strong className="text-brand-green">£{Number(tool.price_4hr).toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar size={13} />
              1 day — <strong className="text-brand-green">£{Number(tool.price_1day).toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar size={13} />
              2 days — <strong className="text-brand-green">£{Number(tool.price_2day).toFixed(2)}</strong>
            </span>
          </div>

          {tool.is_available ? (
            <button
              onClick={() => { setCalHireType(null); setPickedDate(null); setTimeSlots([]); setShowAvailability(true); }}
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
          onClick={resetModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={resetModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h2 className="font-bold text-gray-900 text-lg mb-1">{tool.name}</h2>
            <p className="text-sm text-gray-500 mb-4">Check availability and book</p>

            {/* Step 1: Hire type */}
            <p className={`text-xs font-semibold mb-2 ${calHireType ? 'text-gray-400' : 'text-brand-green'}`}>
              Step 1 — Select hire type
            </p>
            <div className={`flex flex-col rounded-xl overflow-hidden border mb-5 ${!calHireType ? 'border-brand-green ring-2 ring-brand-green ring-opacity-30' : 'border-gray-200'}`}>
              <button
                onClick={() => { setCalHireType('4hr'); setPickedDate(null); setTimeSlots([]); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-colors ${
                  calHireType === '4hr' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock size={14} /> 4 Hours — £{Number(tool.price_4hr).toFixed(2)}
              </button>
              <button
                onClick={() => { setCalHireType('1day'); setPickedDate(null); setTimeSlots([]); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold border-t border-gray-200 transition-colors ${
                  calHireType === '1day' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar size={14} /> 1 Day — £{Number(tool.price_1day).toFixed(2)}
              </button>
              <button
                onClick={() => { setCalHireType('2day'); setPickedDate(null); setTimeSlots([]); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold border-t border-gray-200 transition-colors ${
                  calHireType === '2day' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar size={14} /> 2 Days — £{Number(tool.price_2day).toFixed(2)}
              </button>
            </div>

            {/* Step 2: Calendar */}
            {calHireType && !pickedDate && (
              <>
                <p className="text-xs font-semibold text-gray-500 mb-2">Step 2 — Pick a date</p>
                <p className="text-xs text-gray-400 mb-3">Tap a green date to continue</p>
                <BookingCalendar
                  toolId={tool.id}
                  settings={settings}
                  hireType={calHireType}
                  selectedDate={null}
                  onSelectDate={handleDatePicked}
                  weeksAhead={4}
                />
              </>
            )}

            {/* Step 3: Time slots (4hr only) */}
            {calHireType === '4hr' && pickedDate && (
              <>
                <p className="text-xs font-semibold text-gray-500 mb-1">Step 3 — Pick a time slot</p>
                <p className="text-xs text-gray-400 mb-3">
                  {format(pickedDate, 'EEEE d MMMM')} —{' '}
                  <button onClick={() => { setPickedDate(null); setTimeSlots([]); }} className="text-brand-green underline">
                    change date
                  </button>
                </p>
                {loadingSlots ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Checking availability…</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        disabled={!slot.available}
                        onClick={() => handleTimeSlotPicked(slot)}
                        className={`py-3 px-2 rounded-xl text-sm font-bold transition-colors ${
                          slot.available
                            ? 'bg-green-50 text-brand-green hover:bg-brand-green hover:text-white border border-brand-green'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {!calHireType && (
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

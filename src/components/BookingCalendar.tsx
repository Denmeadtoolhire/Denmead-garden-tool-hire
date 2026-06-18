import React, { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isAfter,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Settings } from '@/lib/supabase';
import { isDateAvailableForBooking, isDayFullyBooked } from '@/lib/availability';

interface BookingCalendarProps {
  toolId: string;
  settings: Settings;
  hireType: '4hr' | '1day' | '2day';
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  weeksAhead?: number;
}

const BookingCalendar = ({
  toolId,
  settings,
  hireType,
  selectedDate,
  onSelectDate,
  weeksAhead,
}: BookingCalendarProps) => {
  const [viewMonth, setViewMonth] = useState(new Date());
  const maxDate = weeksAhead ? addWeeks(new Date(), weeksAhead) : null;
  const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set());
  const [loadingDates, setLoadingDates] = useState(false);

  useEffect(() => {
    loadMonthAvailability(hireType);
  }, [viewMonth, toolId, hireType]);

  const loadMonthAvailability = async (currentHireType: '4hr' | '1day' | '2day') => {
    setLoadingDates(true);
    const days = eachDayOfInterval({
      start: startOfMonth(viewMonth),
      end: endOfMonth(viewMonth),
    });

    const booked = new Set<string>();
    await Promise.all(
      days.map(async (day) => {
        if (!isDateAvailableForBooking(day, settings)) return;
        const fullyBooked = await isDayFullyBooked(toolId, day, settings, currentHireType);
        if (fullyBooked) booked.add(format(day, 'yyyy-MM-dd'));
      })
    );

    setFullyBookedDates(booked);
    setLoadingDates(false);
  };

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getDayState = (day: Date): 'available' | 'booked' | 'unavailable' | 'selected' | 'past' => {
    if (selectedDate && isSameDay(day, selectedDate)) return 'selected';
    if (maxDate && isAfter(day, maxDate)) return 'past';
    if (!isDateAvailableForBooking(day, settings)) return 'past';
    if (fullyBookedDates.has(format(day, 'yyyy-MM-dd'))) return 'booked';
    return 'available';
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-semibold text-gray-800">{format(viewMonth, 'MMMM yyyy')}</h3>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          disabled={maxDate ? isAfter(startOfMonth(addMonths(viewMonth, 1)), maxDate) : false}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 gap-1 ${loadingDates ? 'opacity-60' : ''}`}>
        {days.map((day) => {
          const state = getDayState(day);
          const inMonth = isSameMonth(day, viewMonth);

          let className =
            'text-center text-sm rounded-lg py-2 cursor-pointer transition-colors relative ';

          if (!inMonth) {
            className += 'text-gray-300 cursor-default';
          } else if (state === 'selected') {
            className += 'bg-brand-green text-white font-bold';
          } else if (state === 'available') {
            className += 'text-gray-800 hover:bg-green-50 hover:text-brand-green font-medium';
          } else if (state === 'booked') {
            className += 'text-gray-400 line-through cursor-not-allowed bg-gray-50';
          } else {
            // past or unavailable
            className += 'text-gray-300 cursor-not-allowed';
          }

          return (
            <button
              key={day.toISOString()}
              className={className}
              disabled={!inMonth || state === 'booked' || state === 'past' || state === 'unavailable'}
              onClick={() => {
                if (inMonth && (state === 'available' || state === 'selected')) {
                  onSelectDate(day);
                }
              }}
              title={
                state === 'booked'
                  ? 'Fully booked'
                  : state === 'past'
                  ? 'Not available'
                  : undefined
              }
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-brand-green" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-100 border" />
          <span>Fully booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-white border" />
          <span>Available</span>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;

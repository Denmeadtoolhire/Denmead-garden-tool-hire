import { addHours, setHours, setMinutes, setSeconds, setMilliseconds, isBefore, isAfter, startOfDay, endOfDay, parseISO, format } from 'date-fns';
import { supabase } from './supabase';
import type { Settings } from './supabase';

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

export function setTimeOnDate(date: Date, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr);
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hours), minutes), 0), 0);
}

export function generateHourlySlots(date: Date, settings: Settings): Array<{ start: Date; end: Date; label: string }> {
  const open = setTimeOnDate(date, settings.opening_time);
  const close = setTimeOnDate(date, settings.closing_time);
  const lastStart = addHours(close, -4);
  const slots: Array<{ start: Date; end: Date; label: string }> = [];

  let current = open;
  while (!isAfter(current, lastStart)) {
    const end = addHours(current, 4);
    slots.push({
      start: new Date(current),
      end,
      label: `${format(current, 'HH:mm')} – ${format(end, 'HH:mm')}`,
    });
    current = addHours(current, 1);
  }
  return slots;
}

export function isDateAvailableForBooking(date: Date, settings: Settings): boolean {
  const dayOfWeek = date.getDay();
  if (!settings.open_days.includes(dayOfWeek)) return false;

  const now = new Date();
  const minDate = addHours(now, settings.min_notice_hours);
  const dayEnd = endOfDay(date);
  if (isBefore(dayEnd, minDate)) return false;

  return true;
}

export async function getAvailableSlotsFor4hr(
  toolId: string,
  date: Date,
  settings: Settings
): Promise<Array<{ start: Date; end: Date; label: string; available: boolean }>> {
  const slots = generateHourlySlots(date, settings);
  if (slots.length === 0) return [];

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('tool_id', toolId)
    .eq('status', 'confirmed')
    .gte('start_time', dayStart.toISOString())
    .lte('end_time', dayEnd.toISOString());

  const { data: tool } = await supabase
    .from('tools')
    .select('quantity')
    .eq('id', toolId)
    .single();

  const quantity = tool?.quantity ?? 1;

  const now = new Date();
  const minStart = addHours(now, settings.min_notice_hours);

  return slots.map((slot) => {
    if (isBefore(slot.start, minStart)) {
      return { ...slot, available: false };
    }
    const bookedCount = (bookings ?? []).filter((b) => {
      const bStart = parseISO(b.start_time);
      const bEnd = parseISO(b.end_time);
      return isBefore(bStart, slot.end) && isAfter(bEnd, slot.start);
    }).length;
    return { ...slot, available: bookedCount < quantity };
  });
}

export async function isFullDayAvailable(
  toolId: string,
  date: Date,
  settings: Settings
): Promise<boolean> {
  const open = setTimeOnDate(date, settings.opening_time);
  const close = setTimeOnDate(date, settings.closing_time);

  const { data: tool } = await supabase
    .from('tools')
    .select('quantity')
    .eq('id', toolId)
    .single();

  const quantity = tool?.quantity ?? 1;

  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('tool_id', toolId)
    .eq('status', 'confirmed')
    .gte('start_time', startOfDay(date).toISOString())
    .lte('end_time', endOfDay(date).toISOString());

  const bookedCount = (bookings ?? []).filter((b) => {
    const bStart = parseISO(b.start_time);
    const bEnd = parseISO(b.end_time);
    return isBefore(bStart, close) && isAfter(bEnd, open);
  }).length;

  return bookedCount < quantity;
}

export async function isDayFullyBooked(
  toolId: string,
  date: Date,
  settings: Settings,
  hireType: '4hr' | '1day'
): Promise<boolean> {
  if (hireType === '1day') {
    const avail = await isFullDayAvailable(toolId, date, settings);
    return !avail;
  }
  const slots = await getAvailableSlotsFor4hr(toolId, date, settings);
  return slots.every((s) => !s.available);
}

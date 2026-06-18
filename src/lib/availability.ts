import { addHours, addMinutes, addDays, setHours, setMinutes, setSeconds, setMilliseconds, isBefore, isAfter, startOfDay, endOfDay, parseISO, format } from 'date-fns';

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

export function getDayOpeningTime(settings: Settings, date: Date): string {
  const day = date.getDay().toString();
  return (settings.opening_times?.[day]) || settings.opening_time;
}

export function getDayClosingTime(settings: Settings, date: Date): string {
  const day = date.getDay().toString();
  return (settings.closing_times?.[day]) || settings.closing_time;
}

export function generateHourlySlots(date: Date, settings: Settings): Array<{ start: Date; end: Date; label: string }> {
  const open = setTimeOnDate(date, getDayOpeningTime(settings, date));
  const close = setTimeOnDate(date, getDayClosingTime(settings, date));
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

  // Check both legacy single-tool bookings and new multi-tool booking_items
  const [{ data: legacyBookings }, { data: itemBookings }] = await Promise.all([
    supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('tool_id', toolId)
      .in('status', ['approved', 'pending'])
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString()),
    supabase
      .from('bookings')
      .select('start_time, end_time, booking_items!inner(tool_id)')
      .eq('booking_items.tool_id', toolId)
      .in('status', ['approved', 'pending'])
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString()),
  ]);
  const bookings = [...(legacyBookings ?? []), ...(itemBookings ?? [])];

  const [{ data: tool }, { data: blockedPeriods }] = await Promise.all([
    supabase.from('tools').select('quantity').eq('id', toolId).single(),
    supabase
      .from('blocked_periods')
      .select('start_time, end_time')
      .gte('end_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString()),
  ]);

  const quantity = tool?.quantity ?? 1;

  const now = new Date();
  const minStart = addHours(now, settings.min_notice_hours);

  return slots.map((slot) => {
    if (isBefore(slot.start, minStart)) {
      return { ...slot, available: false };
    }
    const isBlocked = (blockedPeriods ?? []).some((bp) => {
      const bpStart = parseISO(bp.start_time);
      const bpEnd = parseISO(bp.end_time);
      return isBefore(bpStart, slot.end) && isAfter(bpEnd, slot.start);
    });
    if (isBlocked) return { ...slot, available: false };
    const turnaround = settings.turnaround_minutes ?? 30;
    const bookedCount = (bookings ?? []).filter((b) => {
      const bStart = parseISO(b.start_time);
      const bEnd = addMinutes(parseISO(b.end_time), turnaround);
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
  const open = setTimeOnDate(date, getDayOpeningTime(settings, date));
  const close = setTimeOnDate(date, getDayClosingTime(settings, date));

  // Same min-notice check as 4hr slots — if opening time is too soon, not available
  const minStart = addHours(new Date(), settings.min_notice_hours);
  if (isBefore(open, minStart)) return false;

  const [{ data: tool }, { data: blockedPeriods }, { data: legacyBookings }, { data: itemBookings }] = await Promise.all([
    supabase.from('tools').select('quantity').eq('id', toolId).single(),
    supabase
      .from('blocked_periods')
      .select('start_time, end_time')
      .gte('end_time', startOfDay(date).toISOString())
      .lte('start_time', endOfDay(date).toISOString()),
    supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('tool_id', toolId)
      .in('status', ['approved', 'pending'])
      .gte('start_time', startOfDay(date).toISOString())
      .lte('end_time', endOfDay(date).toISOString()),
    supabase
      .from('bookings')
      .select('start_time, end_time, booking_items!inner(tool_id)')
      .eq('booking_items.tool_id', toolId)
      .in('status', ['approved', 'pending'])
      .gte('start_time', startOfDay(date).toISOString())
      .lte('end_time', endOfDay(date).toISOString()),
  ]);
  const bookings = [...(legacyBookings ?? []), ...(itemBookings ?? [])];

  const isBlocked = (blockedPeriods ?? []).some((bp) => {
    const bpStart = parseISO(bp.start_time);
    const bpEnd = parseISO(bp.end_time);
    return isBefore(bpStart, close) && isAfter(bpEnd, open);
  });
  if (isBlocked) return false;

  const quantity = tool?.quantity ?? 1;

  const turnaround = settings.turnaround_minutes ?? 30;
  const bookedCount = (bookings ?? []).filter((b) => {
    const bStart = parseISO(b.start_time);
    const bEnd = addMinutes(parseISO(b.end_time), turnaround);
    return isBefore(bStart, close) && isAfter(bEnd, open);
  }).length;

  return bookedCount < quantity;
}

export async function isDayFullyBooked(
  toolId: string,
  date: Date,
  settings: Settings,
  hireType: '4hr' | '1day' | '2day'
): Promise<boolean> {
  if (hireType === '2day') {
    const day2 = startOfDay(addDays(date, 1));
    // If day 2 is a closed day, this start date can't be booked as a 2-day hire
    if (!isDateAvailableForBooking(day2, settings)) return true;
    const [avail1, avail2] = await Promise.all([
      isFullDayAvailable(toolId, date, settings),
      isFullDayAvailable(toolId, day2, settings),
    ]);
    return !avail1 || !avail2;
  }
  if (hireType === '1day') {
    const avail = await isFullDayAvailable(toolId, date, settings);
    return !avail;
  }
  const slots = await getAvailableSlotsFor4hr(toolId, date, settings);
  return slots.every((s) => !s.available);
}

export async function getAvailableSlotsForMultiTools(
  toolIds: string[],
  date: Date,
  settings: Settings
): Promise<Array<{ start: Date; end: Date; label: string; available: boolean }>> {
  if (toolIds.length === 0) return [];

  // Get slots for first tool as baseline
  const slots = await getAvailableSlotsFor4hr(toolIds[0], date, settings);

  // For each slot, check if ALL tools are available
  const availability = await Promise.all(
    toolIds.map((id) => getAvailableSlotsFor4hr(id, date, settings))
  );

  return slots.map((slot, idx) => {
    // A slot is available only if ALL tools have this slot available
    const allAvailable = availability.every((toolSlots) => {
      const matchingSlot = toolSlots[idx];
      return matchingSlot && matchingSlot.available;
    });
    return { ...slot, available: allAvailable };
  });
}

export async function isFullDayAvailableForMultiTools(
  toolIds: string[],
  date: Date,
  settings: Settings
): Promise<boolean> {
  if (toolIds.length === 0) return false;

  // Check if ALL tools are available for the full day
  const availability = await Promise.all(
    toolIds.map((id) => isFullDayAvailable(id, date, settings))
  );

  return availability.every((avail) => avail);
}

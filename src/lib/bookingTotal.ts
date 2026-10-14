type PricedTool = {
  price_4hr: number;
  price_1day: number;
  price_2day: number;
};

export type PriceableBooking = {
  hire_type: '4hr' | '1day' | '2day';
  tools?: (PricedTool & { name?: string }) | null;
  booking_items?: Array<{
    price_at_booking?: number | null;
    tools?: (PricedTool & { name?: string }) | null;
  }>;
};

function rateFor(tool: PricedTool, hireType: PriceableBooking['hire_type']): number {
  if (hireType === '4hr') return tool.price_4hr;
  if (hireType === '2day') return tool.price_2day;
  return tool.price_1day;
}

// price_at_booking is what the customer was actually quoted, so it wins over
// the tool's current rate whenever it was recorded.
export function getBookingTotal(b: PriceableBooking): number {
  if (b.booking_items && b.booking_items.length > 0) {
    return b.booking_items.reduce((sum, bi) => {
      if (bi.price_at_booking) return sum + bi.price_at_booking;
      return bi.tools ? sum + rateFor(bi.tools, b.hire_type) : sum;
    }, 0);
  }
  return b.tools ? rateFor(b.tools, b.hire_type) : 0;
}

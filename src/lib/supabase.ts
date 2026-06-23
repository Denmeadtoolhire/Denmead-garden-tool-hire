import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type Tool = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  image_url: string | null;
  quantity: number;
  price_4hr: number;
  price_1day: number;
  price_2day: number;
  is_available: boolean;
  created_at: string;
  categories?: Category;
};

export type BookingItem = {
  id: string;
  booking_id: string;
  tool_id: string;
  quantity: number;
  price_at_booking: number;
  created_at: string;
  tools?: Tool;
};

export type Booking = {
  id: string;
  tool_id: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  hire_type: '4hr' | '1day' | '2day';
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'alternative_suggested' | 'cancelled';
  paid: boolean;
  notes: string | null;
  created_at: string;
  suggested_start_time: string | null;
  suggested_end_time: string | null;
  response_token: string | null;
  admin_notes: string | null;
  tools?: Tool;
  booking_items?: BookingItem[];
};

export type Settings = {
  id: number;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  opening_time: string;
  closing_time: string;
  opening_times: Record<string, string>;
  closing_times: Record<string, string>;
  min_notice_hours: number;
  turnaround_minutes: number;
  open_days: number[];
  confirmation_email_subject: string;
  confirmation_email_body: string;
  admin_password_hash: string | null;
};

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatchEmail {
  id: string;
  subject: string;
  body: string;
  recipient_count: number;
  sent_at: string;
  sent_by: string;
}

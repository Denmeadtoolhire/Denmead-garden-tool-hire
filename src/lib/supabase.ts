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
  is_available: boolean;
  created_at: string;
  categories?: Category;
};

export type Booking = {
  id: string;
  tool_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  hire_type: '4hr' | '1day';
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
  tools?: Tool;
};

export type Settings = {
  id: number;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  opening_time: string;
  closing_time: string;
  min_notice_hours: number;
  open_days: number[];
  confirmation_email_subject: string;
  confirmation_email_body: string;
  admin_password_hash: string | null;
};

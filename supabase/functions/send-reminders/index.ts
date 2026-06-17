import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find bookings starting between 3h55m and 4h05m from now (10-min window around the 4hr mark)
  const now = new Date();
  const windowStart = new Date(now.getTime() + (4 * 60 - 5) * 60 * 1000);
  const windowEnd = new Date(now.getTime() + (4 * 60 + 5) * 60 * 1000);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'approved')
    .eq('reminder_sent', false)
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString());

  if (error) {
    console.error('Error fetching bookings:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return new Response(JSON.stringify({ message: 'No reminders to send' }), { status: 200 });
  }

  const results = await Promise.all(
    bookings.map(async (booking) => {
      const startDate = new Date(booking.start_time);
      const endDate = new Date(booking.end_time);

      const formatTime = (d: Date) =>
        d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const formatDate = (d: Date) =>
        d.toLocaleString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

      const timeStr = booking.hire_type === '1day'
        ? 'Full day'
        : `${formatTime(startDate)} – ${formatTime(endDate)}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a6b2f; padding: 24px; text-align: center;">
            <h1 style="color: #f5c518; margin: 0; font-size: 22px;">Denmead Tool &amp; Garden Hire</h1>
            <p style="color: #ccffcc; margin: 6px 0 0; font-size: 14px;">Your Community Tool Rental Experts</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #1a6b2f; margin-top: 0;">⏰ Reminder: Your hire starts in 4 hours!</h2>
            <p>Hi ${booking.customer_name},</p>
            <p>This is a friendly reminder that your tool hire is coming up shortly.</p>

            <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1a6b2f; margin-top: 0;">Your Booking</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #666; width: 35%;">Reference:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${booking.id.substring(0, 8).toUpperCase()}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Date:</td><td style="padding: 8px 0;">${formatDate(startDate)}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Time:</td><td style="padding: 8px 0;">${timeStr}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Hire type:</td><td style="padding: 8px 0;">${booking.hire_type === '4hr' ? '4 Hours' : 'Full Day'}</td></tr>
              </table>
            </div>

            <div style="background: #fff3cd; border: 1px solid #f5c518; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <strong>📍 Collection address:</strong><br>
              <a href="https://www.google.com/maps/search/1+Inhams+Lane+Denmead+PO7+6LX" style="color: #1a6b2f; font-weight: bold; text-decoration: none;">
                1 Inhams Lane, Denmead, PO7 6LX
              </a>
            </div>

            <p><strong>Payment:</strong> Cash or card accepted on collection.</p>
            <p style="color: #666; font-size: 13px;">Questions? Text us on <strong>07889765153</strong> and we'll get back to you asap.</p>
          </div>
          <div style="background: #1a6b2f; padding: 15px; text-align: center; color: white; font-size: 13px;">
            <p style="margin: 0;">Denmead Tool &amp; Garden Hire</p>
            <p style="margin: 5px 0 0;">1 Inhams Lane, Denmead, PO7 6LX | 07889765153</p>
          </div>
        </div>
      `;

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Denmead Tool Hire', email: 'bookings@denmeadtoolhire.co.uk' },
          to: [{ email: booking.customer_email, name: booking.customer_name }],
          subject: `Reminder: Your hire starts in 4 hours — ${formatDate(startDate)}`,
          htmlContent: html,
        }),
      });

      if (res.ok) {
        await supabase.from('bookings').update({ reminder_sent: true }).eq('id', booking.id);
        return { id: booking.id, status: 'sent' };
      } else {
        const errText = await res.text();
        console.error(`Failed to send reminder for booking ${booking.id}:`, errText);
        return { id: booking.id, status: 'failed', error: errText };
      }
    })
  );

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

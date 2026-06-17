import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Calculate tomorrow's date range
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'approved')
    .eq('reminder_sent', false)
    .gte('start_time', tomorrowStart.toISOString())
    .lte('start_time', tomorrowEnd.toISOString());

  if (error) {
    console.error('Error fetching bookings:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return new Response(JSON.stringify({ message: 'No reminders to send' }), { status: 200 });
  }

  const results = await Promise.all(
    bookings.map(async (booking) => {
      const startDate = new Date(booking.start_time).toLocaleString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const emailBody = {
        sender: { name: 'Denmead Tool Hire', email: 'noreply@denmeadtoolhire.co.uk' },
        to: [{ email: booking.customer_email, name: booking.customer_name }],
        subject: 'Reminder: Your tool hire is tomorrow',
        htmlContent: `
          <p>Dear ${booking.customer_name},</p>
          <p>This is a friendly reminder that your tool hire booking is scheduled for <strong>${startDate}</strong>.</p>
          <p>Please remember to collect your tools from:</p>
          <p><strong>Denmead Tool and Garden Hire Ltd</strong><br>
          1 Inhams Lane, Denmead, PO7 6LX<br>
          Tel: 07889765153</p>
          <p>If you have any questions or need to make changes, please contact us as soon as possible.</p>
          <p>Kind regards,<br>Denmead Tool and Garden Hire Ltd</p>
        `,
      };

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody),
      });

      if (res.ok) {
        await supabase
          .from('bookings')
          .update({ reminder_sent: true })
          .eq('id', booking.id);
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

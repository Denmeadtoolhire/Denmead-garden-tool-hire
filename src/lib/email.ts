/**
 * Email functions using the Resend API via direct fetch.
 *
 * IMPORTANT: VITE_RESEND_API_KEY is compiled into the frontend bundle and
 * therefore visible to anyone who inspects the JS. These email functions
 * should ideally be moved to a Supabase Edge Function so the API key stays
 * server-side. For now they work via direct Resend API calls from the browser.
 */

import type { Booking, Tool, Settings } from './supabase';
import { supabase } from './supabase';
import { format, parseISO } from 'date-fns';

const FROM_ADDRESS = 'bookings@denmeadtoolhire.co.uk';
const FROM_NAME = 'Denmead Tool Hire';
const ADMIN_EMAIL = 'denmeadtoolhire@gmail.com';
const PICKUP_ADDRESS = '1 Inhams Lane, Denmead, PO7 6LX';
const PHONE = '07889765153';

function getBrevoKey(): string | null {
  const key = import.meta.env.VITE_BREVO_API_KEY;
  if (!key) {
    console.warn('Brevo API key not configured — email not sent');
    return null;
  }
  return key;
}

async function getSettings(): Promise<Settings | null> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();
    return data as Settings;
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    return null;
  }
}

async function sendEmail(apiKey: string, payload: {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}): Promise<void> {
  try {
    const brevoPayload = {
      sender: { name: payload.fromName || FROM_NAME, email: payload.from || FROM_ADDRESS },
      to: payload.to.map(email => ({ email })),
      subject: payload.subject,
      htmlContent: payload.html,
    };
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(brevoPayload),
    });
    if (!response.ok) {
      console.error('Failed to send email:', await response.text());
    }
  } catch (err) {
    console.error('Email send error:', err);
  }
}

function formatDateTime(startIso: string, endIso: string, hireType: '4hr' | '1day'): string {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const dateStr = format(start, 'EEEE d MMMM yyyy');
  const timeStr =
    hireType === '1day'
      ? 'Full day'
      : `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  return `${dateStr}, ${timeStr}`;
}

function baseHeader(title: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a6b2f; padding: 24px; text-align: center;">
        <h1 style="color: #f5c518; margin: 0; font-size: 22px;">Denmead Tool &amp; Garden Hire</h1>
        <p style="color: #ccffcc; margin: 6px 0 0; font-size: 14px;">Your Community Tool Rental Experts</p>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1a6b2f; margin-top: 0;">${title}</h2>
  `;
}

function baseFooter(): string {
  return `
      </div>
      <div style="background: #1a6b2f; padding: 15px; text-align: center; color: white; font-size: 13px;">
        <p style="margin: 0;">Denmead Tool &amp; Garden Hire</p>
        <p style="margin: 5px 0 0;">${PICKUP_ADDRESS} | ${PHONE}</p>
      </div>
    </div>
  `;
}

function bookingTable(booking: Booking, toolName: string): string {
  const dateTime = formatDateTime(booking.start_time, booking.end_time, booking.hire_type);
  return `
    <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #1a6b2f; margin-top: 0;">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #666; width: 35%;">Tool:</td><td style="padding: 8px 0; font-weight: bold;">${toolName}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Date &amp; Time:</td><td style="padding: 8px 0;">${dateTime}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Hire type:</td><td style="padding: 8px 0;">${booking.hire_type === '4hr' ? '4 Hours' : 'Full Day'}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Reference:</td><td style="padding: 8px 0; font-family: monospace;">${booking.id.substring(0, 8).toUpperCase()}</td></tr>
      </table>
    </div>
  `;
}

function generateGoogleCalendarUrl(
  title: string,
  startDate: Date,
  endDate: Date,
  location: string
): string {
  const formatGoogleDate = (d: Date) => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}00Z`;
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    location: location,
    details: 'Denmead Tool & Garden Hire Booking - Please collect your tool',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateOutlookUrl(
  title: string,
  startDate: Date,
  endDate: Date,
  location: string
): string {
  const formatOutlookDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
  };

  const params = new URLSearchParams({
    rru: 'addevent',
    startdt: formatOutlookDate(startDate),
    enddt: formatOutlookDate(endDate),
    subject: title,
    location: location,
    body: 'Denmead Tool & Garden Hire Booking - Please collect your tool',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Email 1: Sent to customer when they submit a booking request.
 */
export async function sendRequestReceivedEmail(booking: Booking, tool: Tool): Promise<void> {
  const key = getBrevoKey();
  if (!key) return;

  const settings = await getSettings();
  const subject = settings?.request_received_email_subject || 'Booking Request Received - Denmead Tool Hire';
  const bodyText = settings?.request_received_email_body || 'Thank you for your booking request! We have received your request and will review it shortly. You will receive an email confirmation once we have approved your booking.';

  const html = `
    ${baseHeader('Booking Request Received!')}
    <p>Hi ${booking.customer_name},</p>
    <p>${bodyText}</p>
    ${bookingTable(booking, tool.name)}
    <p>If you need to get in touch urgently, please call us on <strong>${PHONE}</strong>.</p>
    ${baseFooter()}
  `;

  await sendEmail(key, {
    to: [booking.customer_email],
    subject,
    html,
  });
}

/**
 * Email 2: Sent to customer when admin approves their booking.
 */
export async function sendApprovalEmail(booking: Booking, tool: Tool): Promise<void> {
  const key = getBrevoKey();
  if (!key) return;

  const settings = await getSettings();
  const subject = settings?.confirmation_email_subject || 'Your Booking is Confirmed - Denmead Tool Hire';
  const bodyText = settings?.confirmation_email_body || 'Great news! Your booking has been confirmed. Please collect your tool at the time specified. We accept cash or card payment on collection.';

  const startDate = parseISO(booking.start_time);
  const endDate = parseISO(booking.end_time);
  const bookingRef = booking.id.substring(0, 8).toUpperCase();

  // Google Calendar link
  const googleCalendarUrl = generateGoogleCalendarUrl(
    tool.name,
    startDate,
    endDate,
    '1 Inhams Lane, Denmead, PO7 6LX'
  );

  // Outlook Calendar link
  const outlookUrl = generateOutlookUrl(
    tool.name,
    startDate,
    endDate,
    '1 Inhams Lane, Denmead, PO7 6LX'
  );

  // iCalendar download link
  const icsDownloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-calendar/${booking.id}`;

  // Google Maps link
  const mapsUrl = 'https://www.google.com/maps/search/1+Inhams+Lane+Denmead+PO7+6LX';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://denmeadtoolhire.co.uk';
  const cancelUrl = booking.response_token
    ? `${origin}/booking/respond?token=${booking.response_token}&action=cancel`
    : null;

  const html = `
    ${baseHeader('Booking Confirmed!')}
    <p>Hi ${booking.customer_name},</p>
    <p>${bodyText}</p>

    <div style="background: #1a6b2f; color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-size: 12px; opacity: 0.9;">Booking Reference</p>
      <p style="margin: 0; font-size: 28px; font-weight: bold; font-family: monospace;">${bookingRef}</p>
    </div>

    ${bookingTable(booking, tool.name)}

    <div style="background: #fff3cd; border: 1px solid #f5c518; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <strong>Collection address:</strong><br>
      <a href="${mapsUrl}" style="color: #1a6b2f; text-decoration: none; font-weight: bold;">
        📍 1 Inhams Lane, Denmead, PO7 6LX
      </a>
    </div>

    <p><strong>Payment:</strong> Cash or card accepted on collection.</p>

    <div style="background: #f0f4f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin-top: 0; font-weight: bold; color: #1a6b2f;">Add to Your Calendar</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <a href="${googleCalendarUrl}"
           style="display: inline-block; background: #1a6b2f; color: white; font-weight: bold; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          📅 Google Calendar
        </a>
        <a href="${outlookUrl}"
           style="display: inline-block; background: #0078d4; color: white; font-weight: bold; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          📅 Outlook
        </a>
        <a href="${icsDownloadUrl}"
           style="display: inline-block; background: #666; color: white; font-weight: bold; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          📥 Download .ics
        </a>
      </div>
    </div>

    ${cancelUrl ? `
    <div style="border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin: 20px 0; background: #fff5f5;">
      <p style="margin: 0 0 10px; font-weight: bold; color: #dc2626;">Need to cancel?</p>
      <p style="margin: 0 0 12px; font-size: 14px; color: #666;">If your plans have changed, you can cancel your booking using the button below.</p>
      <a href="${cancelUrl}"
         style="display: inline-block; background: #dc2626; color: white; font-weight: bold; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">
        Cancel My Booking
      </a>
    </div>
    ` : `<p>If you need to cancel, please call us on <strong>${PHONE}</strong> or email <strong>${ADMIN_EMAIL}</strong>.</p>`}

    <p style="color: #666; font-size: 13px;">Questions? Call us on <strong>${PHONE}</strong> or email <strong>${ADMIN_EMAIL}</strong>.</p>
    ${baseFooter()}
  `;

  await sendEmail(key, {
    to: [booking.customer_email],
    subject: 'Booking Confirmed! - Denmead Tool Hire',
    html,
  });
}

/**
 * Email 3: Sent to customer when admin suggests an alternative date/time.
 */
export async function sendAlternativeSuggestionEmail(
  booking: Booking,
  tool: Tool,
  suggestedStart: string,
  suggestedEnd: string,
  acceptUrl: string,
  declineUrl: string
): Promise<void> {
  const key = getBrevoKey();
  if (!key) return;

  const settings = await getSettings();
  const subject = settings?.alternative_email_subject || 'Alternative Time Suggested - Denmead Tool Hire';
  const bodyText = settings?.alternative_email_body || 'Unfortunately your requested time isn\'t available. We\'d like to suggest an alternative time for your hire. Please use the buttons below to accept or decline.';

  const originalDateTime = formatDateTime(booking.start_time, booking.end_time, booking.hire_type);
  const suggestedDateTime = formatDateTime(suggestedStart, suggestedEnd, booking.hire_type);

  const html = `
    ${baseHeader('Alternative Time Suggested')}
    <p>Hi ${booking.customer_name},</p>
    <p>${bodyText}</p>
    <p>Your original request: <strong>${originalDateTime}</strong></p>
    <p>Our suggested alternative:</p>
    <div style="background: white; border: 2px solid #1a6b2f; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="font-size: 18px; font-weight: bold; color: #1a6b2f; margin: 0;">${suggestedDateTime}</p>
      <p style="color: #666; margin: 8px 0 0;">${booking.hire_type === '4hr' ? '4 Hour hire' : 'Full Day hire'} — ${tool.name}</p>
    </div>
    <p>Please let us know if this works for you:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}"
         style="display: inline-block; background: #1a6b2f; color: white; font-weight: bold; padding: 14px 32px; border-radius: 8px; text-decoration: none; margin: 8px; font-size: 16px;">
        ✓ Accept This Time
      </a>
      <a href="${declineUrl}"
         style="display: inline-block; background: #dc2626; color: white; font-weight: bold; padding: 14px 32px; border-radius: 8px; text-decoration: none; margin: 8px; font-size: 16px;">
        ✗ Decline
      </a>
    </div>
    <p style="color: #666; font-size: 13px;">If you have questions, call us on <strong>${PHONE}</strong> or email <strong>${ADMIN_EMAIL}</strong>.</p>
    ${baseFooter()}
  `;

  await sendEmail(key, {
    to: [booking.customer_email],
    subject,
    html,
  });
}

/**
 * Email 4: Sent to admin when a new booking request comes in.
 */
export async function sendAdminNewRequestEmail(booking: Booking, tool: Tool): Promise<void> {
  const key = getBrevoKey();
  if (!key) return;

  const dateTime = formatDateTime(booking.start_time, booking.end_time, booking.hire_type);

  const html = `
    ${baseHeader(`New Booking Request — ${tool.name}`)}
    <p>A new booking request has been submitted.</p>
    <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #1a6b2f; margin-top: 0;">Request Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #666; width: 35%;">Tool:</td><td style="padding: 8px 0; font-weight: bold;">${tool.name}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Date &amp; Time:</td><td style="padding: 8px 0;">${dateTime}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Hire type:</td><td style="padding: 8px 0;">${booking.hire_type === '4hr' ? '4 Hours' : 'Full Day'}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Reference:</td><td style="padding: 8px 0; font-family: monospace;">${booking.id.substring(0, 8).toUpperCase()}</td></tr>
      </table>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;">
      <h3 style="color: #1a6b2f; margin-top: 0;">Customer</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #666; width: 35%;">Name:</td><td style="padding: 8px 0;">${booking.customer_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${booking.customer_email}">${booking.customer_email}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Phone:</td><td style="padding: 8px 0;"><a href="tel:${booking.customer_phone}">${booking.customer_phone}</a></td></tr>
        ${booking.notes ? `<tr><td style="padding: 8px 0; color: #666;">Notes:</td><td style="padding: 8px 0;">${booking.notes}</td></tr>` : ''}
      </table>
    </div>
    <p>Log in to the admin panel to approve or suggest an alternative time.</p>
    ${baseFooter()}
  `;

  await sendEmail(key, {
    to: [ADMIN_EMAIL],
    subject: `New Booking Request - ${tool.name}`,
    html,
  });
}

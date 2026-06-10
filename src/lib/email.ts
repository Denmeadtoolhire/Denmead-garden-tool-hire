import type { Booking, Tool, Settings } from './supabase';
import { format, parseISO } from 'date-fns';

// Email is sent via a Supabase Edge Function or directly via Resend API
// This module provides helpers to format email content and trigger sends

export async function sendBookingConfirmationEmail(
  booking: Booking,
  tool: Tool,
  settings: Settings
): Promise<void> {
  const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('Resend API key not configured — email not sent');
    return;
  }

  const startDate = parseISO(booking.start_time);
  const endDate = parseISO(booking.end_time);
  const dateStr = format(startDate, 'EEEE d MMMM yyyy');
  const timeStr =
    booking.hire_type === '1day'
      ? 'Full day'
      : `${format(startDate, 'HH:mm')} – ${format(endDate, 'HH:mm')}`;

  const price = booking.hire_type === '4hr' ? tool.price_4hr : tool.price_1day;

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a6b2f; padding: 20px; text-align: center;">
        <h1 style="color: #f5c518; margin: 0;">Denmead Tool & Garden Hire</h1>
        <p style="color: white; margin: 5px 0 0;">Your Community Tool Rental Experts</p>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1a6b2f;">Booking Confirmed!</h2>
        <p>Hi ${booking.customer_name},</p>
        <p>${settings.confirmation_email_body}</p>
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1a6b2f; margin-top: 0;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Tool:</td><td style="padding: 8px 0; font-weight: bold;">${tool.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Date:</td><td style="padding: 8px 0;">${dateStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Time:</td><td style="padding: 8px 0;">${timeStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Hire type:</td><td style="padding: 8px 0;">${booking.hire_type === '4hr' ? '4 Hours' : 'Full Day'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Price:</td><td style="padding: 8px 0; font-weight: bold;">£${price.toFixed(2)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Booking ref:</td><td style="padding: 8px 0; font-family: monospace;">${booking.id.substring(0, 8).toUpperCase()}</td></tr>
          </table>
        </div>
        <div style="background: #fff3cd; border: 1px solid #f5c518; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <strong>Collection address:</strong><br>
          ${settings.address}
        </div>
        <p>If you need to cancel or have any questions, please call us on <strong>${settings.phone}</strong> or email <strong>${settings.email}</strong>.</p>
      </div>
      <div style="background: #1a6b2f; padding: 15px; text-align: center; color: white; font-size: 14px;">
        <p style="margin: 0;">${settings.business_name}</p>
        <p style="margin: 5px 0 0;">${settings.address} | ${settings.phone}</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${settings.business_name} <noreply@denmeadtoolhire.co.uk>`,
        to: [booking.customer_email],
        subject: settings.confirmation_email_subject,
        html: body,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send email:', await response.text());
    }
  } catch (err) {
    console.error('Email send error:', err);
  }
}

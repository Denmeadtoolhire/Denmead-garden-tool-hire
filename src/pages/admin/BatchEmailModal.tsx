import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/supabase';
import { X, Send } from 'lucide-react';

const FROM_ADDRESS = 'Denmead Tool Hire <denmeadtoolhire@gmail.com>';
const ADMIN_EMAIL = 'denmeadtoolhire@gmail.com';
const PICKUP_ADDRESS = '1 Inhams Lane, Denmead, PO7 6LX';
const PHONE = '07889765153';

interface BatchEmailModalProps {
  onClose: () => void;
  optedInCount: number;
}

const BatchEmailModal: React.FC<BatchEmailModalProps> = ({ onClose, optedInCount }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const getResendKey = (): string | null => {
    const key = import.meta.env.VITE_RESEND_API_KEY;
    if (!key) {
      console.warn('Resend API key not configured');
      return null;
    }
    return key;
  };

  const sendEmail = async (apiKey: string, payload: object): Promise<boolean> => {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch (err) {
      console.error('Email send error:', err);
      return false;
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required');
      return;
    }

    const apiKey = getResendKey();
    if (!apiKey) {
      setError('Email configuration error');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Get all opted-in customers
      const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('id, email, name')
        .eq('marketing_opt_in', true);

      if (fetchError || !customers) {
        setError('Failed to fetch opted-in customers');
        setSubmitting(false);
        return;
      }

      if (customers.length === 0) {
        setError('No opted-in customers to send to');
        setSubmitting(false);
        return;
      }

      // Create batch email record
      const { data: batchEmail, error: batchError } = await supabase
        .from('batch_emails')
        .insert({
          subject: subject.trim(),
          body: body.trim(),
          recipient_count: customers.length,
          sent_by: ADMIN_EMAIL,
        })
        .select()
        .single();

      if (batchError || !batchEmail) {
        setError('Failed to create batch email record');
        setSubmitting(false);
        return;
      }

      // Send emails to each customer
      let sentCount = 0;
      const emailFooter = `
---

Denmead Tool & Garden Hire | ${PICKUP_ADDRESS} | ${PHONE}

<a href="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsubscribe?email={{email}}">Don't want to receive these emails? Unsubscribe</a>
      `.trim();

      for (const customer of customers) {
        const unsubscribeUrl = `${window.location.origin}/admin/unsubscribe?email=${encodeURIComponent(customer.email)}`;
        const emailBody = `${body.trim()}

---

Denmead Tool & Garden Hire | ${PICKUP_ADDRESS} | ${PHONE}

<a href="${unsubscribeUrl}">Don't want to receive these emails? Unsubscribe</a>`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1a6b2f; padding: 24px; text-align: center;">
              <h1 style="color: #f5c518; margin: 0; font-size: 22px;">Denmead Tool &amp; Garden Hire</h1>
              <p style="color: #ccffcc; margin: 6px 0 0; font-size: 14px;">Your Community Tool Rental Experts</p>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <p>Hi ${customer.name},</p>
              <div style="white-space: pre-wrap; line-height: 1.6;">${body.trim()}</div>
            </div>
            <div style="background: #1a6b2f; padding: 15px; text-align: center; color: white; font-size: 13px;">
              <p style="margin: 0;">Denmead Tool &amp; Garden Hire</p>
              <p style="margin: 5px 0 0;">${PICKUP_ADDRESS} | ${PHONE}</p>
              <p style="margin: 8px 0 0;">
                <a href="${unsubscribeUrl}" style="color: #f5c518; text-decoration: none;">Unsubscribe from marketing emails</a>
              </p>
            </div>
          </div>
        `;

        const sent = await sendEmail(apiKey, {
          from: FROM_ADDRESS,
          to: [customer.email],
          subject: subject.trim(),
          html,
        });

        if (sent) {
          sentCount++;

          // Log to batch_email_recipients
          await supabase.from('batch_email_recipients').insert({
            batch_email_id: batchEmail.id,
            customer_id: customer.id,
            customer_email: customer.email,
          });
        }
      }

      if (sentCount === 0) {
        setError('Failed to send any emails');
      } else {
        setSuccess(true);
        setSubject('');
        setBody('');
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-800">Send Batch Email</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              <p className="font-semibold">Success!</p>
              <p className="text-sm mt-1">Email sent to {optedInCount} customers.</p>
            </div>
          ) : (
            <>
              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-semibold">Recipients: {optedInCount} customers</p>
                <p className="text-xs mt-1">Only customers who have opted-in to marketing emails will receive this.</p>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  disabled={submitting}
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Body *
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email message here..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono text-sm"
                  disabled={submitting}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Preview toggle */}
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-brand-green hover:underline text-sm font-medium"
                >
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-3 font-semibold">PREVIEW:</p>
                  <div className="bg-white border border-gray-200 rounded p-4 space-y-2 text-sm">
                    <p>
                      <strong>Subject:</strong> {subject || '(no subject)'}
                    </p>
                    <p>
                      <strong>From:</strong> Denmead Tool Hire &lt;denmeadtoolhire@gmail.com&gt;
                    </p>
                    <hr className="my-2" />
                    <div className="whitespace-pre-wrap text-gray-700">{body || '(empty body)'}</div>
                    <hr className="my-2" />
                    <div className="text-xs text-gray-500 border-t pt-2">
                      <p>---</p>
                      <p>Denmead Tool & Garden Hire | 1 Inhams Lane, Denmead, PO7 6LX | 07889765153</p>
                      <p>
                        <a href="#" className="text-brand-green">
                          Don't want to receive these emails? Unsubscribe
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-6 border-t border-gray-200 flex gap-3 justify-end sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={submitting || !subject.trim() || !body.trim() || optedInCount === 0}
              className="px-6 py-2 rounded-lg bg-brand-green text-white font-medium hover:bg-brand-green-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {submitting ? 'Sending...' : 'Send to All'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchEmailModal;

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Mail, Home } from 'lucide-react';

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsubscribe = async () => {
      const emailParam = searchParams.get('email');
      if (!emailParam) {
        setError('No email address provided');
        setLoading(false);
        return;
      }

      setEmail(emailParam);

      try {
        // Update customer's marketing_opt_in to false
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            marketing_opt_in: false,
            updated_at: new Date().toISOString(),
          })
          .eq('email', emailParam);

        if (updateError) {
          console.error('Unsubscribe error:', updateError);
          setError('Failed to unsubscribe. Please try again or contact support.');
        } else {
          setSuccess(true);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    unsubscribe();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-green to-brand-green-dark flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <p className="text-gray-600">Processing your request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-green to-brand-green-dark flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="text-red-600 mb-4 text-5xl">!</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Unsubscribe Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-brand-green text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-green-dark transition-colors"
          >
            <Home size={18} />
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-green to-brand-green-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
        <div className="mb-4 flex justify-center">
          <CheckCircle size={64} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Unsubscribed Successfully</h1>
        <p className="text-gray-600 mb-1">You've been unsubscribed from marketing emails.</p>
        <p className="text-sm text-gray-500 mb-6">{email}</p>
        <p className="text-gray-600 mb-6 text-sm">
          You will no longer receive promotional emails from Denmead Tool Hire.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 bg-brand-green text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-green-dark transition-colors"
        >
          <Home size={18} />
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default UnsubscribePage;

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Users, Mail, Phone, MapPin, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import BatchEmailModal from './BatchEmailModal';
import { format, parseISO } from 'date-fns';

const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOptedInOnly, setShowOptedInOnly] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [rentalHistory, setRentalHistory] = useState<Record<string, any[]>>({});
  const [showBatchEmailModal, setShowBatchEmailModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, showOptedInOnly]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading customers:', error);
      } else {
        setCustomers(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let result = customers;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          (c.phone && c.phone.includes(term))
      );
    }

    if (showOptedInOnly) {
      result = result.filter((c) => c.marketing_opt_in);
    }

    setFilteredCustomers(result);
  };

  const loadRentalHistory = async (customerId: string) => {
    if (rentalHistory[customerId]) {
      // Already loaded
      return;
    }

    const newLoadingHistory = new Set(loadingHistory);
    newLoadingHistory.add(customerId);
    setLoadingHistory(newLoadingHistory);

    try {
      const { data } = await supabase
        .from('bookings')
        .select('*, tools(name)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      setRentalHistory((prev) => ({
        ...prev,
        [customerId]: data || [],
      }));
    } catch (err) {
      console.error('Error loading rental history:', err);
    } finally {
      newLoadingHistory.delete(customerId);
      setLoadingHistory(newLoadingHistory);
    }
  };

  const toggleExpand = async (customerId: string) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
    } else {
      await loadRentalHistory(customerId);
      setExpandedCustomerId(customerId);
    }
  };

  const toggleOptIn = async (customer: Customer) => {
    const newOptInStatus = !customer.marketing_opt_in;
    const confirmed = window.confirm(
      `Are you sure you want to ${newOptInStatus ? 'opt-in' : 'opt-out'} this customer from marketing emails?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({ marketing_opt_in: newOptInStatus, updated_at: new Date().toISOString() })
        .eq('id', customer.id);

      if (error) {
        console.error('Error updating customer:', error);
        alert('Failed to update customer');
      } else {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === customer.id ? { ...c, marketing_opt_in: newOptInStatus } : c
          )
        );
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to update customer');
    }
  };

  const optedInCount = customers.filter((c) => c.marketing_opt_in).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={32} className="text-brand-green" />
              Customers
            </h1>
            <p className="text-gray-600 mt-1">{customers.length} total customers</p>
          </div>
          <button
            onClick={() => setShowBatchEmailModal(true)}
            className="bg-brand-green text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-green-dark transition-colors flex items-center gap-2"
          >
            <Mail size={18} />
            Send Batch Email
          </button>
        </div>

        {/* Search and filter */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={showOptedInOnly}
                onChange={(e) => setShowOptedInOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-green focus:ring-2 focus:ring-brand-green"
              />
              Show only opted-in for marketing ({optedInCount})
            </label>
            <div className="text-sm text-gray-600">
              Showing {filteredCustomers.length} of {customers.length} customers
            </div>
          </div>
        </div>

        {/* Customer list */}
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            No customers found
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div
                  onClick={() => toggleExpand(customer.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Expand icon */}
                    <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                      {expandedCustomerId === customer.id ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>

                    {/* Customer info grid */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">Name</p>
                        <p className="font-semibold text-gray-800 truncate">{customer.name}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">Email</p>
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-brand-green hover:underline truncate text-sm"
                        >
                          {customer.email}
                        </a>
                      </div>
                      <div className="min-w-0 hidden md:block">
                        <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                        {customer.phone ? (
                          <a href={`tel:${customer.phone}`} className="text-brand-green hover:underline text-sm">
                            {customer.phone}
                          </a>
                        ) : (
                          <p className="text-gray-400 text-sm">—</p>
                        )}
                      </div>
                      <div className="hidden md:block">
                        <p className="text-xs text-gray-500 mb-0.5">Marketing</p>
                        <div className="flex items-center gap-1">
                          {customer.marketing_opt_in ? (
                            <CheckCircle size={18} className="text-green-600" />
                          ) : (
                            <XCircle size={18} className="text-gray-300" />
                          )}
                        </div>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-xs text-gray-500 mb-0.5">Actions</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOptIn(customer);
                          }}
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            customer.marketing_opt_in
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {customer.marketing_opt_in ? 'Unsubscribe' : 'Subscribe'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded rental history */}
                {expandedCustomerId === customer.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Rental History</h4>
                    {loadingHistory.has(customer.id) ? (
                      <p className="text-gray-500 text-sm">Loading history...</p>
                    ) : rentalHistory[customer.id]?.length === 0 ? (
                      <p className="text-gray-500 text-sm">No rentals yet</p>
                    ) : (
                      <div className="space-y-2">
                        {rentalHistory[customer.id]?.map((booking: any) => (
                          <div key={booking.id} className="bg-white p-3 rounded-lg text-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-800">{booking.tools?.name}</p>
                                <p className="text-gray-600 text-xs mt-1">
                                  {format(parseISO(booking.start_time), 'dd MMM yyyy')} •{' '}
                                  {booking.hire_type === '4hr' ? '4 Hours' : 'Full Day'}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                  booking.status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : booking.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {booking.status === 'pending'
                                  ? 'Pending'
                                  : booking.status === 'approved'
                                  ? 'Approved'
                                  : booking.status === 'cancelled'
                                  ? 'Cancelled'
                                  : 'Alternative'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mobile actions */}
                    <div className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                        {customer.phone && (
                          <a href={`tel:${customer.phone}`} className="text-brand-green hover:underline flex items-center gap-1">
                            <Phone size={14} />
                            {customer.phone}
                          </a>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOptIn(customer);
                        }}
                        className={`w-full text-sm font-medium px-3 py-2 rounded ${
                          customer.marketing_opt_in
                            ? 'bg-red-50 text-red-600'
                            : 'bg-green-50 text-green-600'
                        }`}
                      >
                        {customer.marketing_opt_in ? 'Unsubscribe from emails' : 'Subscribe to emails'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch email modal */}
      {showBatchEmailModal && (
        <BatchEmailModal
          onClose={() => setShowBatchEmailModal(false)}
          optedInCount={optedInCount}
        />
      )}
    </AdminLayout>
  );
};

export default CustomersPage;

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) toast.error('Failed to load customers');
    else setCustomers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function addCustomer(customer) {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();
    if (error) { toast.error('Failed to add customer'); return null; }
    await fetchCustomers();
    return data;
  }

  async function updateCustomer(id, updates) {
    const { error } = await supabase.from('customers').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update customer'); return; }
    await fetchCustomers();
  }

  async function deleteCustomer(id) {
    // Delete child rows first (orders, measurements), then the customer
    await supabase.from('orders').delete().eq('customer_id', id);
    await supabase.from('measurements').delete().eq('customer_id', id);
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return false; }
    toast.success('Customer deleted');
    await fetchCustomers();
    return true;
  }

  function searchCustomers(query) {
    const q = (query || '').toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, searchCustomers, refetch: fetchCustomers };
}

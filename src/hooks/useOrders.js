import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useOrders(customerId = null) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false });

    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error } = await query;
    if (error) toast.error('Failed to load orders');
    else setOrders(data || []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function addOrder(order) {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single();

    if (orderError) { toast.error('Failed to create order'); return null; }

    toast.success('Order created');
    await fetchOrders();
    return orderData;
  }

  async function updateOrder(id, updates) {
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) { toast.error('Update failed'); return; }
    toast.success('Updated');
    await fetchOrders();
  }

  async function deleteOrder(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) { toast.error('Failed to delete order'); return; }
    toast.success('Order deleted');
    await fetchOrders();
  }

  function getPendingCount() {
    return orders.filter(o => o.status === 'pending').length;
  }

  function getDeliveredCount() {
    return orders.filter(o => o.status === 'delivered').length;
  }

  async function getRevenueByMonth(from, to) {
    let query = supabase
      .from('orders')
      .select('amount, payment_status, payment_mode, order_date')
      .eq('payment_status', 'paid');
    if (from) query = query.gte('order_date', from);
    if (to) query = query.lte('order_date', to);
    const { data } = await query;
    return data || [];
  }

  async function getPaymentModeSplit() {
    const { data } = await supabase
      .from('orders')
      .select('payment_mode, amount, payment_status')
      .eq('payment_status', 'paid');
    return data || [];
  }

  return {
    orders, loading,
    addOrder, updateOrder, deleteOrder,
    getPendingCount, getDeliveredCount,
    getRevenueByMonth, getPaymentModeSplit,
    refetch: fetchOrders,
  };
}

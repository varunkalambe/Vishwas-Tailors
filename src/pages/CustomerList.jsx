import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useCustomers } from '../hooks/useCustomers';
import { supabase } from '../lib/supabase';

export default function CustomerList() {
  const { customers, loading } = useCustomers();
  const navigate = useNavigate();
  const [filterBy, setFilterBy] = useState('name');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = () =>
      supabase.from('orders').select('customer_id, bill_no, delivery_date, payment_status, payment_mode')
        .order('created_at', { ascending: false })
        .then(({ data }) => setOrders(data || []));

    fetchOrders();

    const channel = supabase.channel('customerlist-orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchOrders)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const getLatestOrder = (customerId) => orders.find(o => o.customer_id === customerId);

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (filterBy === 'name') return c.name?.toLowerCase().includes(q);
    if (filterBy === 'mobile') return c.phone?.includes(q);
    if (filterBy === 'bill') {
      const order = getLatestOrder(c.id);
      return order?.bill_no?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Customer List</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-wrap items-center gap-4">
          {[
            { key: 'name', label: 'Name' },
            { key: 'mobile', label: 'Mobile' },
            { key: 'bill', label: 'Bill No.' },
          ].map(f => (
            <label key={f.key} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name="filterBy" value={f.key} checked={filterBy === f.key} onChange={() => setFilterBy(f.key)} className="accent-primary" />
              {f.label}
            </label>
          ))}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={'Search by ' + filterBy + '...'}
            className="flex-1 min-w-[150px] px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary outline-none"
          />
          <button
            onClick={() => {/* filtering is reactive — explicit no-op to signal button works */}}
            className="px-4 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark"
          >
            Search
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mobile</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bill No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Delivery Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No customers found</td></tr>
              ) : (
                filtered.map(c => {
                  const order = getLatestOrder(c.id);
                  return (
                    <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/customers/' + c.id)}>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{order?.bill_no || c.serial_no || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{order?.delivery_date ? format(new Date(order.delivery_date), 'dd/MM/yyyy') : '—'}</td>
                      <td className="px-4 py-3">
                        {order ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                            {order.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
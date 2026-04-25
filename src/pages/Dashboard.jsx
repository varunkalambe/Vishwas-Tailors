import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalCustomers: 0, pendingOrders: 0, deliveredOrders: 0 });
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function loadData() {
    setLoading(true);
    const [customersRes, ordersRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('orders')
        .select('id, status, customer_id, bill_no, delivery_date, amount, payment_status, payment_mode')
        .order('created_at', { ascending: false }),
    ]);

    const orders = ordersRes.data || [];
    const custs  = customersRes.data || [];

    const custsWithOrders = custs.filter(c => orders.some(o => o.customer_id === c.id));
setStats({
  totalCustomers:  custsWithOrders.length,
  pendingOrders:   orders.filter(o => o.status === 'pending').length,
  deliveredOrders: orders.filter(o => o.status === 'delivered').length,
});

    const customerMap = custs.map(c => {
      const custOrders = orders.filter(o => o.customer_id === c.id);
      const latest = custOrders[0];
      return {
        ...c,
        latest_order_id: latest?.id             || null,
        bill_no:         latest?.bill_no        || c.serial_no || '—',
        delivery_date:   latest?.delivery_date  || null,
        payment_status:  latest?.payment_status || null,
        payment_mode:    latest?.payment_mode   || null,
      };
    });
    setCustomers(customerMap);
    setLoading(false);
  }

  

  const filtered = customers.filter(c =>
  c.latest_order_id &&
  (
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.serial_no?.toLowerCase().includes(search.toLowerCase())
  )
);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;

  const statCards = [
    { label: 'Total Customers',  value: stats.totalCustomers,  icon: '👥' },
    { label: 'Pending Orders',   value: stats.pendingOrders,   icon: '📋' },
    { label: 'Delivered Orders', value: stats.deliveredOrders, icon: '📦' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Home</h1>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="text-xl sm:text-2xl">{s.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">{s.label}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <Link
          to="/customers/new"
          className="shrink-0 bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap"
        >
          + Add Customer
        </Link>
        <div className="flex-1 relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">No customers found</p>
        ) : filtered.map(c => (
          <div
            key={c.id}
            className="bg-white rounded-lg border border-gray-200 p-3 active:bg-gray-50"
            onClick={() => navigate(`/customers/${c.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.phone || '—'}</p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                c.payment_status === 'paid' ? 'bg-green-100 text-green-800' : c.payment_status ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {c.payment_status === 'paid' ? '✓ Paid' : c.payment_status ? 'Unpaid' : '—'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>Bill: <span className="text-gray-700 font-medium">{c.bill_no}</span></span>
              {c.delivery_date && (
                <span>Del: <span className="text-gray-700">{format(new Date(c.delivery_date), 'dd/MM/yy')}</span></span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={e => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                className="flex-1 py-1.5 bg-primary text-white rounded text-xs font-semibold"
              >View</button>
              <button
                onClick={e => { e.stopPropagation(); navigate(`/customers/${c.id}/edit`); }}
                className="flex-1 py-1.5 bg-accent text-white rounded text-xs font-semibold"
              >Edit</button>
              
            </div>
          </div>
        ))}
      </div>

      {/* Tablet + Desktop table */}
      <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 hidden md:table-cell">Mobile</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Bill No.</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 hidden lg:table-cell">Delivery Date</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No customers found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    <div>{c.name}</div>
                    <div className="text-xs text-gray-400 md:hidden">{c.phone || '—'}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-600 hidden md:table-cell">{c.phone || '—'}</td>
                  <td className="px-3 py-3 text-gray-600">{c.bill_no}</td>
                  <td className="px-3 py-3 text-gray-600 hidden lg:table-cell">
                    {c.delivery_date ? format(new Date(c.delivery_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {c.payment_status === 'paid' ? '✓ Paid' : c.payment_status ? 'Unpaid' : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => navigate(`/customers/${c.id}`)}
                        className="px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-dark transition"
                      >View</button>
                      <button
                        onClick={() => navigate(`/customers/${c.id}/edit`)}
                        className="px-3 py-1.5 bg-accent text-white rounded text-xs font-semibold hover:bg-accent-dark transition"
                      >Edit</button>
                      
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
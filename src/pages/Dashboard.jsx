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
        .select('status, customer_id, bill_no, delivery_date, amount, payment_status, payment_mode, customers(name, phone)')
        .order('created_at', { ascending: false }),
    ]);

    const orders = ordersRes.data || [];
    const custs  = customersRes.data || [];

    setStats({
      totalCustomers: custs.length,
      pendingOrders:   orders.filter(o => o.status === 'pending').length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    });

    const customerMap = custs.map(c => {
      const custOrders = orders.filter(o => o.customer_id === c.id);
      const latest = custOrders[0];
      return {
        ...c,
        bill_no:        latest?.bill_no        || c.serial_no || '—',
        delivery_date:  latest?.delivery_date  || null,
        payment_status: latest?.payment_status || null,
        payment_mode:   latest?.payment_mode   || null,
      };
    });
    setCustomers(customerMap);
    setLoading(false);
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.serial_no?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;

  const statCards = [
    { label: 'Total Customers',   value: stats.totalCustomers,   icon: '👥' },
    { label: 'Pending Orders',    value: stats.pendingOrders,    icon: '📋' },
    { label: 'Delivered Orders',  value: stats.deliveredOrders,  icon: '📦' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Home</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Link
          to="/customers/new"
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Add Customer
        </Link>
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mobile</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bill No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Delivery Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                {/* ── Actions column: fixed min-width so buttons never wrap ── */}
                <th className="text-right px-4 py-3 font-medium text-gray-600" style={{ minWidth: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No customers found</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.bill_no}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.delivery_date ? format(new Date(c.delivery_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {c.payment_status === 'paid' ? '✓ Paid' : c.payment_status ? 'Unpaid' : '—'}
                      </span>
                    </td>
                    {/*
                      ── Actions cell ────────────────────────────────────────
                      • whitespace-nowrap  → buttons never wrap to new line
                      • inline-flex + gap  → buttons sit side-by-side always
                    */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-dark transition leading-none"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/customers/${c.id}/edit`)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-accent text-white rounded text-xs font-semibold hover:bg-accent-dark transition leading-none"
                        >
                          Edit
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
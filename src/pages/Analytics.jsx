import { useState, useEffect, useCallback } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { supabase } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

const C = { cash: '#16a34a', online: '#3b82f6', pending: '#f59e0b', delivered: '#16a34a' };

export default function Analytics() {
  const defaultTo = new Date().toISOString().slice(0, 10);
  const defaultFrom = subMonths(new Date(), 12).toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .gte('order_date', fromDate)
      .lte('order_date', toDate)
      .order('order_date', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('analytics-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, loadData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadData]);

  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const cashCollected = paidOrders.filter(o => o.payment_mode === 'cash').reduce((s, o) => s + Number(o.amount || 0), 0);
  const onlineCollected = paidOrders.filter(o => o.payment_mode === 'online').reduce((s, o) => s + Number(o.amount || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  const months = eachMonthOfInterval({
    start: startOfMonth(new Date(fromDate)),
    end: startOfMonth(new Date(toDate)),
  });

  const revenueByMonth = months.map(month => {
    const label = format(month, 'MMM yy');
    const mo = paidOrders.filter(o => {
      const d = new Date(o.order_date);
      return d >= startOfMonth(month) && d <= endOfMonth(month);
    });
    return {
      month: label,
      cash: mo.filter(o => o.payment_mode === 'cash').reduce((s, o) => s + Number(o.amount || 0), 0),
      online: mo.filter(o => o.payment_mode === 'online').reduce((s, o) => s + Number(o.amount || 0), 0),
    };
  });

  const ordersVolumeByMonth = months.map(month => {
    const label = format(month, 'MMM yy');
    const count = orders.filter(o => {
      const d = new Date(o.order_date);
      return d >= startOfMonth(month) && d <= endOfMonth(month);
    }).length;
    return { month: label, orders: count };
  });

  const statusData = [
    { name: 'Pending', value: pendingCount, color: C.pending },
    { name: 'Delivered', value: deliveredCount, color: C.delivered },
  ];

  const cashCount = orders.filter(o => o.payment_mode === 'cash').length;
  const onlineCount = orders.filter(o => o.payment_mode === 'online').length;
  const paymentModeData = [
    { name: 'Cash', value: cashCount, color: C.cash },
    { name: 'Online', value: onlineCount, color: C.online },
  ];

  const customerSpend = {};
  orders.forEach(o => {
    if (!customerSpend[o.customer_id]) {
      customerSpend[o.customer_id] = {
        name: o.customers?.name || '—',
        phone: o.customers?.phone || '—',
        totalSpent: 0,
        visits: 0,
      };
    }
    customerSpend[o.customer_id].totalSpent += Number(o.amount || 0);
    customerSpend[o.customer_id].visits += 1;
  });
  const topCustomers = Object.values(customerSpend)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  const kpiCards = [
    { label: 'Total Orders', value: orders.length },
    { label: 'Total Revenue', value: '₹' + totalRevenue.toLocaleString('en-IN') },
    { label: 'Pending Orders', value: pendingCount },
    { label: 'Delivered Orders', value: deliveredCount },
    { label: 'Cash Collected', value: '₹' + cashCollected.toLocaleString('en-IN') },
    { label: 'Online Collected', value: '₹' + onlineCollected.toLocaleString('en-IN') },
  ];

  if (loading) return <div className="text-center py-20 text-gray-500">Loading analytics...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 block">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">To</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpiCards.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Bar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue — Cash vs Online</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
            <Tooltip formatter={v => '₹' + Number(v).toLocaleString('en-IN')} />
            <Legend />
            <Bar dataKey="cash" name="Cash" fill={C.cash} radius={[4, 4, 0, 0]} />
            <Bar dataKey="online" name="Online" fill={C.online} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two Donut Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Order Status</h2>
          <p className="text-xs text-gray-400 mb-3">Total: {orders.length}</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Payment Mode Split</h2>
          <p className="text-xs text-gray-400 mb-3">Total: {orders.length}</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={paymentModeData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {paymentModeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Orders Volume */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Orders Volume</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={ordersVolumeByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="orders" name="Orders" stroke={C.online} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Top 10 Customers by Spend</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Orders</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No data in this range</td></tr>
              ) : topCustomers.map((c, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{c.visits}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">₹{c.totalSpent.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

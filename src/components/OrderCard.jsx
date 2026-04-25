// src/components/OrderCard.jsx
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';
import { useOrders } from '../hooks/useOrders';

export default function OrderCard({ order }) {
  const { updateOrder } = useOrders(order.customer_id);

  const amount  = Number(order.amount  || 0);
  const advance = Number(order.advance || 0);
  const balance = Math.max(0, amount - advance);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
      {/* ── Top row: Bill No + Amount ── */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Bill No.</p>
          <p className="font-bold text-gray-900 text-lg">{order.bill_no || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Amount</p>
          <p className="text-2xl font-bold text-gray-900">₹{amount.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* ── Dates ── */}
      <div className="grid grid-cols-2 gap-3 text-sm mb-3 pb-3 border-b border-gray-100">
        <div>
          <p className="text-gray-500 text-xs">Order Date</p>
          <p className="font-medium">
            {order.order_date ? format(new Date(order.order_date), 'dd MMM yyyy') : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Delivery</p>
          <p className="font-medium">
            {order.delivery_date ? format(new Date(order.delivery_date), 'dd MMM yyyy') : '—'}
          </p>
        </div>
      </div>

      {/* ── Advance / Balance row ── */}
      <div className="grid grid-cols-2 gap-3 text-sm mb-3 pb-3 border-b border-gray-100">
        <div>
          <p className="text-gray-500 text-xs">Advance Paid</p>
          <p className="font-medium text-green-700">₹{advance.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Balance Due</p>
          <p className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{balance.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* ── Status badges ── */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <StatusBadge status={order.status} />
        <StatusBadge paymentStatus={order.payment_status} />
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          order.payment_mode === 'cash' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {order.payment_mode === 'cash' ? 'Cash' : 'Online'}
        </span>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex gap-2 flex-wrap">
        {order.status === 'pending' && (
          <button
            onClick={() => updateOrder(order.id, { status: 'delivered' })}
            className="text-xs px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-md font-medium"
          >
            Mark Delivered
          </button>
        )}
        {order.status === 'delivered' && (
          <button
            onClick={() => updateOrder(order.id, { status: 'pending' })}
            className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium"
          >
            Mark Undelivered
          </button>
        )}
        {order.payment_status === 'unpaid' && (
          <button
            onClick={() => updateOrder(order.id, { payment_status: 'paid' })}
            className="text-xs px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-md font-medium"
          >
            Mark Paid
          </button>
        )}
      </div>
    </div>
  );
}
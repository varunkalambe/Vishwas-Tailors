import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Keys to display with friendly labels for trouser
const TROUSER_LABELS = {
  length: 'Length', waist: 'Waist', hip: 'Hip',
  bottom: 'Bottom', knee: 'Knee', thigh: 'Thigh',
  fly: 'Fly', stitching: 'Stitching',
  kp: 'KP', bp: 'BP', sp: 'SP',
};

// Keys to display with friendly labels for shirt
const SHIRT_LABELS = {
  length: 'Length', chest: 'Chest', chest2: 'Chest 2',
  sleeves: 'Sleeves', waist: 'Waist', shoulder: 'Shoulder', cuff: 'Cuff',
  hip: 'Hip', collar: 'Collar',
  buShirt: 'BU-Shirt', buCut: 'BU-Cut', appleCut: 'Apple Cut',
};

function formatVal(v) {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return v || '—';
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, mRes, oRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('measurements').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ]);
    setCustomer(cRes.data);
    setMeasurements(mRes.data || []);
    setOrders(oRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function updateOrder(orderId, updates) {
    const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
    if (error) { toast.error('Update failed'); return; }
    toast.success('Updated');
    await load();
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!customer) return <div className="text-center py-20 text-red-600">Customer not found</div>;

  const latestOrder = orders[0];
  const latestTrouser = measurements.find(m => m.type === 'trouser');
  const latestShirt = measurements.find(m => m.type === 'shirt');

  

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link to="/customers" className="text-primary hover:underline text-sm">← Back to list</Link>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
            {customer.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
            {customer.serial_no && <p className="text-xs text-gray-400">Key: {customer.serial_no}</p>}
          </div>
        </div>

        <div className="border border-gray-200 rounded-md p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Basic Info</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-500">Serial No.</span>
            <span className="text-gray-900">{customer.serial_no || '—'}</span>
            <span className="text-gray-500">Bill No.</span>
            <span className="text-gray-900">{latestOrder?.bill_no || '—'}</span>
            <span className="text-gray-500">Order Date</span>
            <span className="text-gray-900">{latestOrder?.order_date ? format(new Date(latestOrder.order_date), 'dd MMM yyyy') : '—'}</span>
            <span className="text-gray-500">Delivery Date</span>
            <span className="text-gray-900">{latestOrder?.delivery_date ? format(new Date(latestOrder.delivery_date), 'dd MMM yyyy') : '—'}</span>
            <span className="text-gray-500">Phone</span>
            <span className="text-gray-900">{customer.phone || '—'}</span>
            <span className="text-gray-500">Amount</span>
            <span className="text-gray-900">{latestOrder ? '₹' + Number(latestOrder.amount || 0).toLocaleString('en-IN') : '—'}</span>
            <span className="text-gray-500">Advance</span>
            <span className="text-gray-900">{latestOrder ? '₹' + Number(latestOrder.advance || 0).toLocaleString('en-IN') : '—'}</span>
            <span className="text-gray-500">Balance</span>
            <span className="text-gray-900 font-semibold text-red-600">
              {latestOrder ? '₹' + Math.max(0, Number(latestOrder.amount || 0) - Number(latestOrder.advance || 0)).toLocaleString('en-IN') : '—'}
            </span>
            <span className="text-gray-500">Payment Mode</span>
            <span className="text-gray-900 capitalize">{latestOrder?.payment_mode || '—'}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm flex-wrap">
          <span className="text-gray-500">Status:</span>
          {!latestOrder ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">No Orders</span>
          ) : (
            <>
              <span className={'px-2.5 py-0.5 rounded-full text-xs font-medium ' + (latestOrder.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>
                {latestOrder.status === 'delivered' ? 'Delivered' : 'Pending'}
              </span>
              <span className={'px-2.5 py-0.5 rounded-full text-xs font-medium ' + (latestOrder.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700')}>
                {latestOrder.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
              </span>
            </>
          )}
        </div>

        {/* Trouser Measurements — merged single section */}
        {latestTrouser && (
          <div className="mt-4 border border-gray-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Trouser Measurements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {Object.entries(TROUSER_LABELS).map(([k, label]) => {
                const v = latestTrouser.data?.[k];
                if (v === '' || v === null || v === undefined) return null;
                return (
                  <div key={k}>
                    <span className="text-gray-400 text-xs">{label}</span>
                    <p className="font-medium text-gray-900">{formatVal(v)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shirt Measurements */}
        {latestShirt && (
          <div className="mt-3 border border-gray-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Shirt Measurements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {Object.entries(SHIRT_LABELS).map(([k, label]) => {
                const v = latestShirt.data?.[k];
                if (v === '' || v === null || v === undefined || v === false) return null;
                return (
                  <div key={k}>
                    <span className="text-gray-400 text-xs">{label}</span>
                    <p className="font-medium text-gray-900">{formatVal(v)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {customer.notes && (
          <div className="mt-3 p-3 bg-amber-50 rounded text-sm text-gray-700">
            <strong>Notes:</strong> {customer.notes}
          </div>
        )}

        <div className="mt-4 flex gap-3 flex-wrap">
          <button onClick={() => navigate('/customers/' + id + '/edit')}
            className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded text-sm font-medium">
            EDIT
          </button>
          {latestOrder && latestOrder.status === 'pending' && (
            <button onClick={() => updateOrder(latestOrder.id, { status: 'delivered' })}
              className="px-5 py-2 bg-accent hover:bg-accent-dark text-white rounded text-sm font-medium">
              Mark Delivered
            </button>
          )}
          {latestOrder && latestOrder.status === 'delivered' && (
            <button onClick={() => updateOrder(latestOrder.id, { status: 'pending' })}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-medium">
              Mark Undelivered
            </button>
          )}
          {latestOrder && latestOrder.payment_status === 'unpaid' && (
            <button onClick={() => updateOrder(latestOrder.id, { payment_status: 'paid', advance: latestOrder.amount })}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">
              Mark Paid
            </button>
          )}
          {latestOrder && latestOrder.payment_status === 'paid' && (
            <button onClick={() => updateOrder(latestOrder.id, { payment_status: 'unpaid' })}
              className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm font-medium">
              Mark Unpaid
            </button>
          )}
        </div>
      </div>

      {orders.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Order History ({orders.length})</h2>
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border border-gray-100 rounded text-sm">
                <div>
                  <span className="font-medium">Bill #{o.bill_no || '—'}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">₹{Number(o.amount).toLocaleString('en-IN')}</span>
                  {o.advance > 0 && (
                    <>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-gray-500">Adv ₹{Number(o.advance).toLocaleString('en-IN')}</span>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-red-600 font-medium">Bal ₹{Math.max(0, Number(o.amount) - Number(o.advance)).toLocaleString('en-IN')}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (o.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>
                    {o.status}
                  </span>
                  <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (o.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700')}>
                    {o.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
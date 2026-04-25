import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import toast from 'react-hot-toast';

const emptyTrouser = {
  length: '', waist: '', hip: '', bottom: '', knee: '', thigh: '',
  fly: '', stitching: 'yes', kp: '', bp: '', sp: '',
};

const emptyShirt = {
  length: '', chest: '',
  sleeves: '', waist: '', shoulder: '', cuff: '',
  hip: '', collar: '',
  buShirt: false, buCut: false, appleCut: false,
};

/* ── Apple-style toggle helper ─────────────────────────────────────── */
function AppleToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '44px',
        height: '26px',
        borderRadius: '13px',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.22s ease',
        backgroundColor: value ? '#34C759' : '#D1D5DB',
        padding: 0,
        flexShrink: 0,
      }}
      aria-pressed={value}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: value ? '21px' : '3px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
          transition: 'left 0.22s ease',
        }}
      />
    </button>
  );
}

export default function AddCustomer() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addCustomer, deleteCustomer } = useCustomers();
  const { addOrder } = useOrders(isEdit ? id : null);

  const [form, setForm] = useState({
    serial_no: '', name: '', phone: '', date: '', delivery_date: '', notes: '',
  });
  const [trouserEnabled, setTrouserEnabled] = useState(true);
  const [shirtEnabled, setShirtEnabled] = useState(true);
  const [trouser, setTrouser] = useState(emptyTrouser);
  const [shirt, setShirt] = useState(emptyShirt);
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState('');
  const [advance, setAdvance] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [orderId, setOrderId] = useState(null);
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isEdit) loadCustomer();
  }, [id]);

  async function loadCustomer() {
    const { data: customer, error: cErr } = await supabase
      .from('customers').select('*').eq('id', id).single();
    if (cErr || !customer) {
      toast.error('Failed to load customer');
      return;
    }

    // Base form from customer row
    setForm({
      serial_no: customer.serial_no || '',
      name: customer.name || '',
      phone: customer.phone || '',
      date: '',          // will be overwritten from order below
      delivery_date: '', // will be overwritten from order below
      notes: customer.notes || '',
    });

    // Load measurements
    const { data: measurements } = await supabase
      .from('measurements')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    const t = measurements?.find(m => m.type === 'trouser');
    const s = measurements?.find(m => m.type === 'shirt');

    if (t?.data) {
      setTrouser({ ...emptyTrouser, ...t.data });
      setTrouserEnabled(true);
    } else {
      setTrouserEnabled(false);
    }

    if (s?.data) {
      setShirt({ ...emptyShirt, ...s.data });
      setShirtEnabled(true);
    } else {
      setShirtEnabled(false);
    }

    // Load latest order — populate bill/amount/payment + dates
    const { data: latestOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestOrder) {
      setOrderId(latestOrder.id);
      setBillNo(latestOrder.bill_no || '');
      setAmount(latestOrder.amount != null ? String(latestOrder.amount) : '');
      setAdvance(latestOrder.advance != null ? String(latestOrder.advance) : '');
      setPaymentMode(latestOrder.payment_mode || 'cash');
      setPaymentStatus(latestOrder.payment_status || 'unpaid');
      // ── FIX: use order_date for the "Order Date" field, not customer.created_at
      setForm(prev => ({
        ...prev,
        date: latestOrder.order_date
          ? latestOrder.order_date.slice(0, 10)
          : customer.created_at?.slice(0, 10) || '',
        delivery_date: latestOrder.delivery_date
          ? latestOrder.delivery_date.slice(0, 10)
          : '',
      }));
    } else {
      // No order yet — pre-fill date from customer created_at
      setForm(prev => ({
        ...prev,
        date: customer.created_at?.slice(0, 10) || '',
      }));
    }
  }

  const handleFormChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handleTrouserChange = (field, value) => setTrouser(prev => ({ ...prev, [field]: value }));
  const handleShirtChange = (field, value) => setShirt(prev => ({ ...prev, [field]: value }));

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);

    try {
      if (isEdit) {
        /* ─── 1. Update customer row ──────────────────────────────────── */
        const { error: custErr } = await supabase
          .from('customers')
          .update({
            name: form.name,
            phone: form.phone,
            serial_no: form.serial_no,
            notes: form.notes,
          })
          .eq('id', id);
        if (custErr) throw custErr;

        /* ─── 2. Upsert trouser measurements ─────────────────────────── */
        if (trouserEnabled) {
          const { error: tErr } = await supabase
            .from('measurements')
            .upsert(
              { customer_id: id, type: 'trouser', data: trouser },
              { onConflict: 'customer_id,type' }
            );
          if (tErr) {
            console.warn('Trouser upsert error (may be missing unique constraint):', tErr);
            // Fallback: delete old + insert fresh
            await supabase.from('measurements')
              .delete().eq('customer_id', id).eq('type', 'trouser');
            await supabase.from('measurements')
              .insert({ customer_id: id, type: 'trouser', data: trouser });
          }
        } else {
          await supabase.from('measurements')
            .delete().eq('customer_id', id).eq('type', 'trouser');
        }

        /* ─── 3. Upsert shirt measurements ───────────────────────────── */
        if (shirtEnabled) {
          const { error: sErr } = await supabase
            .from('measurements')
            .upsert(
              { customer_id: id, type: 'shirt', data: shirt },
              { onConflict: 'customer_id,type' }
            );
          if (sErr) {
            console.warn('Shirt upsert error (may be missing unique constraint):', sErr);
            // Fallback: delete old + insert fresh
            await supabase.from('measurements')
              .delete().eq('customer_id', id).eq('type', 'shirt');
            await supabase.from('measurements')
              .insert({ customer_id: id, type: 'shirt', data: shirt });
          }
        } else {
          await supabase.from('measurements')
            .delete().eq('customer_id', id).eq('type', 'shirt');
        }

        /* ─── 4. Update or create order ──────────────────────────────── */
        if (orderId) {
          const orderPayload = {
            bill_no: billNo,
            amount: Number(amount) || 0,
            advance: Number(advance) || 0,
            delivery_date: form.delivery_date || null,
            payment_mode: paymentMode,
            payment_status: paymentStatus,
          };
          // Only update order_date if the user has a value
          if (form.date) orderPayload.order_date = form.date;

          const { error: oErr } = await supabase
            .from('orders')
            .update(orderPayload)
            .eq('id', orderId);
          if (oErr) throw oErr;
        } else if (billNo || amount) {
          // No existing order — create one
          const { error: oErr } = await supabase.from('orders').insert([{
            customer_id: id,
            bill_no: billNo,
            amount: Number(amount) || 0,
            advance: Number(advance) || 0,
            order_date: form.date || new Date().toISOString().slice(0, 10),
            delivery_date: form.delivery_date || null,
            status: 'pending',
            payment_status: paymentStatus,
            payment_mode: paymentMode,
          }]);
          if (oErr) throw oErr;
        }

        toast.success('Customer updated');
        navigate(`/customers/${id}`);

      } else {
        /* ─── ADD NEW CUSTOMER ───────────────────────────────────────── */
        const customer = await addCustomer({
          name: form.name,
          phone: form.phone,
          serial_no: form.serial_no,
          notes: form.notes,
        });
        if (!customer) { setSaving(false); return; }

        const measurements = [];
        if (trouserEnabled) measurements.push({ customer_id: customer.id, type: 'trouser', data: trouser });
        if (shirtEnabled)   measurements.push({ customer_id: customer.id, type: 'shirt',   data: shirt   });

        if (measurements.length > 0) {
          await supabase.from('measurements').insert(measurements);
        }

        if (billNo || amount) {
          await addOrder({
            customer_id: customer.id,
            bill_no: billNo,
            amount: Number(amount) || 0,
            advance: Number(advance) || 0,
            order_date: form.date || new Date().toISOString().slice(0, 10),
            delivery_date: form.delivery_date || null,
            status: 'pending',
            payment_status: paymentStatus,
            payment_mode: paymentMode,
          });
        }

        toast.success('Customer added');
        navigate(`/customers/${customer.id}`);
      }
    } catch (err) {
      toast.error('Save failed: ' + (err?.message || 'unknown error'));
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!orderId) { toast.error('No order to delete'); return; }
    if (!confirm('Delete this order for ' + form.name + '?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) { toast.error('Failed to delete order'); return; }
    toast.success('Order deleted');
    navigate(`/customers/${id}`);
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none";
  const labelCls = "text-xs text-gray-500 mb-1 block";
  const measureInput = "w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-primary outline-none";

  return (
    <div className="max-w-5xl mx-auto space-y-4 px-2 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Customer' : 'Add Customer'}</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Basic Info ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 border-b pb-1">Basic Info</h2>
            <div>
              <label className={labelCls}>Serial No</label>
              <input className={inputCls} value={form.serial_no} onChange={e => handleFormChange('serial_no', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact No</label>
              <input className={inputCls} value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Order Date</label>
              <input type="date" className={inputCls} value={form.date} onChange={e => handleFormChange('date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Delivery Date</label>
              <input type="date" className={inputCls} value={form.delivery_date} onChange={e => handleFormChange('delivery_date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Bill No</label>
              <input className={inputCls} value={billNo} onChange={e => setBillNo(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Amount</label>
              <input type="number" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Advance</label>
              <input type="number" className={inputCls} value={advance} onChange={e => setAdvance(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Balance</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 text-gray-900 font-medium">
                ₹{Math.max(0, (Number(amount) || 0) - (Number(advance) || 0)).toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <label className={labelCls}>Payment Mode</label>
              <div className="flex gap-2">
                {['cash', 'online'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`flex-1 py-2 rounded text-sm font-medium transition border ${
                      paymentMode === mode
                        ? 'bg-accent text-white border-accent'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {mode === 'cash' ? 'Cash' : 'Online'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Payment Status</label>
              <div className="flex gap-2">
                {['unpaid', 'paid'].map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPaymentStatus(status)}
                    className={`flex-1 py-2 rounded text-sm font-medium transition border ${
                      paymentStatus === status
                        ? 'bg-accent text-white border-accent'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {status === 'paid' ? '✓ Paid' : 'Unpaid'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Trouser ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1">
              <h2 className="text-sm font-semibold text-gray-700">Trouser</h2>
              <AppleToggle value={trouserEnabled} onChange={setTrouserEnabled} />
            </div>

            {trouserEnabled && (
              <div className="space-y-2">
                {[
                  ['Length', 'length'], ['Waist', 'waist'], ['Hip', 'hip'],
                  ['Bottom', 'bottom'], ['Knee', 'knee'], ['Thigh', 'thigh'],
                ].map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{label}</span>
                    <input
                      className={measureInput}
                      value={trouser[key]}
                      onChange={e => handleTrouserChange(key, e.target.value)}
                    />
                  </div>
                ))}

                <div className="flex items-center justify-between">
  <span className="text-xs text-gray-500">Fly</span>
  <input
    className={measureInput}
    value={trouser.fly}
    onChange={e => handleTrouserChange('fly', e.target.value)}
  />
</div>
                {/* Stitching — Yes / No selector */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Stitching</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleTrouserChange('stitching', 'yes')}
                      className={`px-3 py-1 rounded text-xs font-medium border transition ${
                        trouser.stitching === 'yes'
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-500 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTrouserChange('stitching', 'no')}
                      className={`px-3 py-1 rounded text-xs font-medium border transition ${
                        trouser.stitching === 'no'
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-500 border-gray-300 hover:border-red-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* K, KP, BP, SP */}
                {[['KP', 'kp'], ['BP', 'bp'], ['SP', 'sp']].map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{label}</span>
                    <input
                      className={measureInput}
                      value={trouser[key]}
                      onChange={e => handleTrouserChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Shirt ───────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1">
              <h2 className="text-sm font-semibold text-gray-700">Shirt</h2>
              <AppleToggle value={shirtEnabled} onChange={setShirtEnabled} />
            </div>

            {shirtEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Length</span>
                  <input className={measureInput} value={shirt.length} onChange={e => handleShirtChange('length', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Chest</span>
                  <input className={measureInput} value={shirt.chest} onChange={e => handleShirtChange('chest', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Sleeves</span>
                  <input className={measureInput} value={shirt.sleeves} onChange={e => handleShirtChange('sleeves', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Waist</span>
                  <input className={measureInput} value={shirt.waist} onChange={e => handleShirtChange('waist', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Shoulder</span>
                  <input className={measureInput} value={shirt.shoulder} onChange={e => handleShirtChange('shoulder', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Cuff</span>
                  <input className={measureInput} value={shirt.cuff} onChange={e => handleShirtChange('cuff', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Hip</span>
                  <input className={measureInput} value={shirt.hip} onChange={e => handleShirtChange('hip', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Collar</span>
                  <input className={measureInput} value={shirt.collar} onChange={e => handleShirtChange('collar', e.target.value)} />
                </div>

                {/* BU-Shirt toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">BU-Shirt</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${shirt.buShirt ? 'text-green-600' : 'text-gray-400'}`}>
                      {shirt.buShirt ? 'ON' : 'OFF'}
                    </span>
                    <AppleToggle value={shirt.buShirt} onChange={val => handleShirtChange('buShirt', val)} />
                  </div>
                </div>

                {/* BU-Cut toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">BU-Cut</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${shirt.buCut ? 'text-green-600' : 'text-gray-400'}`}>
                      {shirt.buCut ? 'ON' : 'OFF'}
                    </span>
                    <AppleToggle value={shirt.buCut} onChange={val => handleShirtChange('buCut', val)} />
                  </div>
                </div>

                {/* Apple Cut toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Apple Cut</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${shirt.appleCut ? 'text-green-600' : 'text-gray-400'}`}>
                      {shirt.appleCut ? 'ON' : 'OFF'}
                    </span>
                    <AppleToggle value={shirt.appleCut} onChange={val => handleShirtChange('appleCut', val)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom section ──────────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Note:</span>
            <input
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="Any special instructions..."
              value={form.notes}
              onChange={e => handleFormChange('notes', e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-accent hover:bg-accent-dark text-white rounded font-medium text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'SAVE'}
            </button>
            {isEdit && (
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm"
              >
                DELETE
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
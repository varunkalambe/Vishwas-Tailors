export default function StatusBadge({ status, paymentStatus }) {
  if (paymentStatus) {
    const isPaid = paymentStatus === 'paid';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isPaid ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
      }`}>
        {isPaid ? '✓ Paid' : '◌ Unpaid'}
      </span>
    );
  }

  const isPending = status === 'pending';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isPending ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
    }`}>
      {isPending ? '⏳ Pending' : '✓ Delivered'}
    </span>
  );
}

export default function PaymentSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {['cash', 'online'].map(key => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 py-2 rounded border-2 text-sm font-medium transition ${
            value === key
              ? 'border-accent bg-accent text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          {key === 'cash' ? 'Cash' : 'Online'}
        </button>
      ))}
    </div>
  );
}

export function Expenses() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <p className="mt-4 text-lg text-gray-600">
          Expense tracking feature is coming soon.
        </p>
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-xl font-semibold text-green-900">Planned Features:</h2>
          <ul className="mt-4 space-y-2 text-green-800">
            <li>• Record expenses and receipts</li>
            <li>• Categorize expenses</li>
            <li>• Attach receipts and documents</li>
            <li>• Expense reports</li>
            <li>• Tax deduction tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Invoices() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-4 text-lg text-gray-600">
          Invoice management feature is coming soon.
        </p>
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-900">Planned Features:</h2>
          <ul className="mt-4 space-y-2 text-blue-800">
            <li>• Create and send invoices</li>
            <li>• Track payment status</li>
            <li>• Recurring invoices</li>
            <li>• Invoice templates</li>
            <li>• PDF generation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

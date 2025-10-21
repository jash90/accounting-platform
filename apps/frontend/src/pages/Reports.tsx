export function Reports() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-4 text-lg text-gray-600">
          Financial reporting feature is coming soon.
        </p>
        <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <h2 className="text-xl font-semibold text-amber-900">Planned Features:</h2>
          <ul className="mt-4 space-y-2 text-amber-800">
            <li>• Profit and loss statements</li>
            <li>• Balance sheets</li>
            <li>• Cash flow reports</li>
            <li>• Tax reports</li>
            <li>• Custom report builder</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

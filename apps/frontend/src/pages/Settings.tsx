export function Settings() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-4 text-lg text-gray-600">
          Application settings feature is coming soon.
        </p>
        <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
          <h2 className="text-xl font-semibold text-slate-900">Planned Features:</h2>
          <ul className="mt-4 space-y-2 text-slate-800">
            <li>• User profile management</li>
            <li>• Company settings</li>
            <li>• Notification preferences</li>
            <li>• Security settings (MFA, password change)</li>
            <li>• Integration settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

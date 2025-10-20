export function Dashboard() {

  const statsCards = [
    { name: 'Total Revenue', value: '$45,231.89', change: '+20.1%', changeType: 'positive' },
    { name: 'Outstanding Invoices', value: '12', change: '-4.5%', changeType: 'negative' },
    { name: 'Total Expenses', value: '$12,234.56', change: '+10.2%', changeType: 'positive' },
    { name: 'Active Clients', value: '24', change: '+12.5%', changeType: 'positive' },
  ];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statsCards.map((stat) => (
                  <div key={stat.name} className="card hover:shadow-lg transition-shadow animate-slide-up">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                        <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className={`inline-flex items-center text-sm font-medium ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.changeType === 'positive' ? '↑' : '↓'} {stat.change}
                        <span className="ml-2 text-gray-500">from last month</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="card">
                <div className="card-header -m-6 mb-6 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                          📄
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">Invoice #INV-00{i} created</p>
                          <p className="text-sm text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Paid
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button className="btn-primary">
                    + New Invoice
                  </button>
                  <button className="btn-secondary">
                    + Add Expense
                  </button>
                  <button className="btn-secondary">
                    + New Client
                  </button>
                  <button className="btn-secondary">
                    Generate Report
                  </button>
                </div>
        </div>
      </div>
    </div>
  );
}
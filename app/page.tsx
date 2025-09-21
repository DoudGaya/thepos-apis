export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            The POS API
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Data and Bills Payment Platform Backend
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-primary-600">Authentication</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>POST /api/auth/login</li>
                  <li>POST /api/auth/register</li>
                  <li>POST /api/auth/verify-otp</li>
                  <li>POST /api/auth/send-otp</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-primary-600">Data Services</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>GET /api/data/networks</li>
                  <li>GET /api/data/plans/:network</li>
                  <li>POST /api/data/purchase</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-primary-600">Bill Payment</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>GET /api/bills/types</li>
                  <li>POST /api/bills/validate-meter</li>
                  <li>POST /api/bills/pay</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-primary-600">User & Admin</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>GET /api/user/profile</li>
                  <li>GET /api/subscriptions</li>
                  <li>GET /admin - Admin Dashboard</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Note:</strong> This is the backend API. The mobile app will consume these endpoints.
                Visit <a href="/admin" className="text-primary-600 underline">/admin</a> for the admin dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

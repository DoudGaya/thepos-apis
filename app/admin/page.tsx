import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

async function getStats() {
  const [userCount, transactionCount, totalRevenue, activeSubscriptions] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.transaction.count(),
    prisma.transaction.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
  ])

  return {
    userCount,
    transactionCount,
    totalRevenue: totalRevenue._sum.amount || 0,
    activeSubscriptions,
  }
}

async function getRecentTransactions() {
  return await prisma.transaction.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  })
}

export default async function AdminDashboard() {
  // Check authentication
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value

  if (!token) {
    redirect('/admin/login')
  }

  try {
    const decoded = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user || user.role !== 'ADMIN') {
      redirect('/admin/login')
    }
  } catch (error) {
    redirect('/admin/login')
  }

  const stats = await getStats()
  const recentTransactions = await getRecentTransactions()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">The POS Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin Dashboard</span>
              <form action="/admin/logout" method="post">
                <button
                  type="submit"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">👥</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.userCount.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">💳</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Transactions</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.transactionCount.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">₦</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">₦{stats.totalRevenue.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">🔄</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Subscriptions</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.activeSubscriptions.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4">
            <nav className="flex space-x-8">
              <a href="/admin" className="text-primary-600 border-b-2 border-primary-600 pb-2 text-sm font-medium">
                Dashboard
              </a>
              <a href="/admin/users" className="text-gray-500 hover:text-gray-700 pb-2 text-sm font-medium">
                Users
              </a>
              <a href="/admin/transactions" className="text-gray-500 hover:text-gray-700 pb-2 text-sm font-medium">
                Transactions
              </a>
              <a href="/admin/subscriptions" className="text-gray-500 hover:text-gray-700 pb-2 text-sm font-medium">
                Subscriptions
              </a>
              <a href="/admin/referrals" className="text-gray-500 hover:text-gray-700 pb-2 text-sm font-medium">
                Referrals
              </a>
            </nav>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.user.firstName} {transaction.user.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{transaction.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === 'SUCCESS' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

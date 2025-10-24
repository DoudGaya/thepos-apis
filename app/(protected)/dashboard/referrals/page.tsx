'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { 
  Users,
  Copy,
  Check,
  Share2,
  TrendingUp,
  DollarSign,
  UserPlus,
  Gift,
  Wallet,
  Facebook,
  Twitter,
  MessageCircle,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingEarnings: number
  referralCode: string
}

interface ReferredUser {
  id: string
  name: string
  email: string
  joinedAt: string
  totalSpent: number
  yourEarnings: number
  status: 'ACTIVE' | 'INACTIVE'
}

export default function ReferralsPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    referralCode: '',
  })
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // TODO: Fetch real referral data from API
    setTimeout(() => {
      setStats({
        totalReferrals: 12,
        activeReferrals: 8,
        totalEarnings: 2500,
        pendingEarnings: 500,
        referralCode: 'ABC123',
      })

      setReferredUsers([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
          totalSpent: 5000,
          yourEarnings: 250,
          status: 'ACTIVE',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          totalSpent: 12000,
          yourEarnings: 600,
          status: 'ACTIVE',
        },
        {
          id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
          totalSpent: 8000,
          yourEarnings: 400,
          status: 'ACTIVE',
        },
      ])

      setLoading(false)
    }, 500)
  }, [])

  const referralLink = `${window.location.origin}/register?ref=${stats.referralCode}`

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    const message = `Join ThePOS and get amazing discounts on airtime, data, and utility bills! Use my referral code: ${stats.referralCode}`
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message + ' ' + referralLink)}`, '_blank')
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank')
        break
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralLink)}`, '_blank')
        break
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent('Join ThePOS!')}&body=${encodeURIComponent(message + '\n\n' + referralLink)}`
        break
    }
  }

  const handleWithdraw = async () => {
    if (stats.pendingEarnings < 500) {
      setError('Minimum withdrawal amount is ₦500')
      setTimeout(() => setError(''), 3000)
      return
    }

    setWithdrawLoading(true)
    setError('')
    setSuccess('')

    try {
      // TODO: Implement withdrawal API
      const response = await fetch('/api/referrals/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Withdrawal failed')
      }

      // Simulate success
      setTimeout(() => {
        setSuccess(`₦${stats.pendingEarnings.toLocaleString()} has been transferred to your main wallet!`)
        setStats({
          ...stats,
          totalEarnings: stats.totalEarnings + stats.pendingEarnings,
          pendingEarnings: 0,
        })
        setWithdrawLoading(false)
        setTimeout(() => setSuccess(''), 5000)
      }, 1500)
    } catch (err) {
      setError('Failed to withdraw earnings. Please try again.')
      setWithdrawLoading(false)
      setTimeout(() => setError(''), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Referral Program</h1>
        <p className="mt-1 text-gray-600">Invite friends and earn 5% commission on their transactions!</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Referrals</p>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalReferrals}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.activeReferrals} active users</p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">₦{stats.totalEarnings.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-indigo-100">Pending Earnings</p>
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">₦{stats.pendingEarnings.toLocaleString()}</p>
          <p className="text-xs text-indigo-100 mt-1">Ready to withdraw</p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Commission Rate</p>
            <Gift className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">5%</p>
          <p className="text-xs text-gray-500 mt-1">On all transactions</p>
        </div>
      </div>

      {/* Withdraw Button */}
      {stats.pendingEarnings > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Ready to Withdraw!</h3>
              <p className="text-sm text-gray-600">
                You have ₦{stats.pendingEarnings.toLocaleString()} available to transfer to your main wallet
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {withdrawLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Withdraw Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Referral Code & Link */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Your Referral Code
        </h2>

        <div className="space-y-4">
          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Referral Code</label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-3 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg font-mono text-2xl font-bold text-indigo-600 text-center">
                {stats.referralCode}
              </div>
              <button
                onClick={() => handleCopy(stats.referralCode)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Referral Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Referral Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => handleCopy(referralLink)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Share Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Share via</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => handleShare('whatsapp')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={() => handleShare('facebook')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </button>
              <button
                onClick={() => handleShare('email')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-indigo-600" />
          How the Referral Program Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Share Your Code</p>
              <p className="text-sm text-gray-600">Invite friends using your unique referral code or link</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">They Register</p>
              <p className="text-sm text-gray-600">Your friend signs up and starts making transactions</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Earn Commission</p>
              <p className="text-sm text-gray-600">Get 5% commission on all their transactions forever!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referred Users */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Your Referrals ({referredUsers.length})
          </h2>
        </div>

        {referredUsers.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {referredUsers.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Joined {new Date(user.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-600">Total Spent:</span>
                      <span className="font-semibold text-gray-900">₦{user.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Your Earnings:</span>
                      <span className="font-bold text-green-600">₦{user.yourEarnings.toLocaleString()}</span>
                    </div>
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-2">No referrals yet</p>
            <p className="text-sm text-gray-400">Start sharing your referral code to earn commissions!</p>
          </div>
        )}
      </div>
    </div>
  )
}

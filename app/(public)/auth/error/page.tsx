'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, { title: string; description: string }> = {
    Configuration: {
      title: 'Server Configuration Error',
      description: 'There is a problem with the server configuration. Please contact support.',
    },
    AccessDenied: {
      title: 'Access Denied',
      description: 'You do not have permission to sign in.',
    },
    Verification: {
      title: 'Verification Failed',
      description: 'The verification token has expired or has already been used.',
    },
    OAuthSignin: {
      title: 'OAuth Sign-In Error',
      description: 'Error in constructing an authorization URL.',
    },
    OAuthCallback: {
      title: 'OAuth Callback Error',
      description: 'Error in handling the response from an OAuth provider.',
    },
    OAuthCreateAccount: {
      title: 'OAuth Account Creation Failed',
      description: 'Could not create OAuth provider user in the database.',
    },
    EmailCreateAccount: {
      title: 'Email Account Creation Failed',
      description: 'Could not create email provider user in the database.',
    },
    Callback: {
      title: 'Callback Error',
      description: 'Error in the OAuth callback handler route.',
    },
    OAuthAccountNotLinked: {
      title: 'Account Not Linked',
      description: 'This email is already associated with another account. Please sign in with your original method.',
    },
    EmailSignin: {
      title: 'Email Sign-In Error',
      description: 'The email verification link may be invalid or expired.',
    },
    CredentialsSignin: {
      title: 'Invalid Credentials',
      description: 'The email or password you entered is incorrect. Please try again.',
    },
    SessionRequired: {
      title: 'Authentication Required',
      description: 'Please sign in to access this page.',
    },
    Default: {
      title: 'Authentication Error',
      description: 'An error occurred during authentication. Please try again.',
    },
  }

  const errorInfo = error && errorMessages[error] ? errorMessages[error] : errorMessages.Default

  return (
    <div className="space-y-8">
      {/* Logo/Brand */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          ThePOS
        </h1>
      </div>

      {/* Error Card */}
      <div className="bg-white p-8 rounded-xl shadow-lg space-y-6">
        <div className="flex justify-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {errorInfo.title}
          </h2>
          <p className="text-gray-600">
            {errorInfo.description}
          </p>
        </div>

        {/* Error Code */}
        {error && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm text-gray-500 text-center">
              Error Code: <span className="font-mono font-semibold text-gray-700">{error}</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/login"
            className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Support Link */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link href="/support" className="font-medium text-indigo-600 hover:text-indigo-500">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

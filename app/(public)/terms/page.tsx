import React from 'react'

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Terms of Service</h1>
      <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300">
        <p className="mb-4"><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">1. Introduction</h2>
        <p className="mb-4">Welcome to NillarPay. These Terms of Service ("Terms") govern your use of the NillarPay mobile application, website, and related services (collectively, the "Service"). By creating an account or using our Service, you agree to these Terms.</p>
        
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">2. Account Registration and Security</h2>
        <p className="mb-4">To use most features of the Service, you must register for an account. You agree to:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Provide accurate, current, and complete information during registration.</li>
          <li>Maintain the security of your password and identification.</li>
          <li>Maintain and promptly update your registration data.</li>
          <li>Accept all risks of unauthorized access to the detailed information you provide to us.</li>
        </ul>
        <p className="mb-4">You are responsible for all activity on your NillarPay account.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">3. Services Provided</h2>
        <p className="mb-4">NillarPay provides a platform for:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Airtime and Data purchases.</li>
            <li>Utility bill payments (Electricity, TV subscriptions, etc.).</li>
            <li>Wallet funding and transfers.</li>
        </ul>
        <p className="mb-4">We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">4. Payments and Transactions</h2>
        <p className="mb-4">When you initiate a transaction, you authorize us to charge your funding source. You are responsible for all transactions processed through your account.</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Fees:</strong> We may charge fees for certain transactions. Any applicable fees will be displayed prior to completion of the transaction.</li>
            <li><strong>Failed Transactions:</strong> In the event of a failed transaction where your account was debited, we will attempt to reverse the transaction within 24 hours.</li>
            <li><strong>Refunds:</strong> Refunds are processed according to our Refund Policy and at our sole discretion for valid disputes.</li>
        </ul>

         <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">5. User Conduct</h2>
        <p className="mb-4">You agree not to use the Service for:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Any illegal purpose or in violation of any local, state, national, or international law.</li>
            <li>Violating or encouraging others to violate any right of a third party.</li>
            <li>Interfering with security-related features of the Service.</li>
            <li>Fraudulent activities, money laundering, or terrorist financing.</li>
        </ul>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">6. Limitation of Liability</h2>
        <p className="mb-4">To the fullest extent permitted by law, NillarPay shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">7. Termination</h2>
        <p className="mb-4">We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">8. Governing Law</h2>
        <p className="mb-4">These Terms shall be governed and construed in accordance with the laws of Nigeria, without regard to its conflict of law provisions.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">9. Changes to Terms</h2>
        <p className="mb-4">We reserve the right to modify these Terms at any time. We will provide notice of significant changes. Your continued use of the Service following the posting of changes will mean that you accept and agree to the changes.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">10. Contact Us</h2>
        <p className="mb-4">If you have any questions about these Terms, please contact us at support@nillarpay.com.</p>
      </div>
    </div>
  )
}

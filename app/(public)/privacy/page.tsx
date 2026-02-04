import React from 'react'

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Privacy Policy</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2>1. Introduction</h2>
        <p>Welcome to NillarPay ("we," "us," or "our"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services for digital payments, bill payments, airtime and data purchases, and other financial transactions.</p>
        
        <h2>2. Information We Collect</h2>
        <p>We collect information to provide and improve our services:</p>
        <ul>
          <li><strong>Personal Information:</strong> Name, email address, phone number, date of birth, and other identifiers you provide when creating an account or using our services.</li>
          <li><strong>Financial Information:</strong> Bank account details, payment card information, transaction history, and wallet balances.</li>
          <li><strong>Transaction Data:</strong> Details of payments, transfers, bill payments, airtime/data purchases, and other transactions you perform through our app.</li>
          <li><strong>Device and Usage Data:</strong> Device information, IP address, app usage statistics, and log data.</li>
          <li><strong>Location Data:</strong> With your permission, we may collect location data to enable location-based services or fraud prevention.</li>
        </ul>
        
        <h2>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide, operate, and maintain our payment and utility services</li>
          <li>Process transactions, payments, and bill payments</li>
          <li>Verify your identity and prevent fraud</li>
          <li>Communicate with you about your account, transactions, or service updates</li>
          <li>Improve and personalize your experience with our app</li>
          <li>Comply with legal obligations and regulatory requirements</li>
          <li>Send you marketing communications (with your consent)</li>
        </ul>
        
        <h2>4. How We Share Your Information</h2>
        <p>We may share your information with:</p>
        <ul>
          <li><strong>Service Providers:</strong> Third-party payment processors, banks, telecom providers, and utility companies necessary to process your transactions.</li>
          <li><strong>Business Partners:</strong> Partners who help us provide services like airtime/data distribution or bill payment processing.</li>
          <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights and the safety of our users.</li>
          <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition of our business.</li>
        </ul>
        <p>We do not sell your personal information to third parties for marketing purposes.</p>
        
        <h2>5. Data Security</h2>
        <p>We implement industry-standard security measures to protect your information, including:</p>
        <ul>
          <li>Encryption of data in transit and at rest</li>
          <li>Secure authentication and authorization systems</li>
          <li>Regular security audits and updates</li>
          <li>Access controls and monitoring</li>
        </ul>
        <p>However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.</p>
        
        <h2>6. Your Rights and Choices</h2>
        <p>You have the following rights regarding your personal information:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
          <li><strong>Correction:</strong> Update or correct your personal information.</li>
          <li><strong>Deletion:</strong> Request deletion of your account and personal information (subject to legal and regulatory requirements).</li>
          <li><strong>Portability:</strong> Request your data in a portable format.</li>
          <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time.</li>
        </ul>
        <p>To exercise these rights, please contact us using the information provided below.</p>
        
        <h2>7. Data Retention</h2>
        <p>We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. Transaction records may be retained longer for regulatory compliance.</p>
        
        <h2>8. International Data Transfers</h2>
        <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during such transfers.</p>
        
        <h2>9. Children's Privacy</h2>
        <p>Our services are not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information.</p>
        
        <h2>10. Cookies and Tracking Technologies</h2>
        <p>Our mobile app may use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can manage cookie preferences through your device settings.</p>
        
        <h2>11. Third-Party Services</h2>
        <p>Our app may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.</p>
        
        <h2>12. Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by:</p>
        <ul>
          <li>Posting the updated policy in our app</li>
          <li>Sending you an email notification</li>
          <li>Providing an in-app notification</li>
        </ul>
        <p>Your continued use of our services after the effective date of changes constitutes acceptance of the updated policy.</p>
        
        <h2>13. Contact Us</h2>
        <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
        <ul>
          <li><strong>Email:</strong> privacy@nillarpay.com</li>
          <li><strong>Phone:</strong> +234 XXX XXX XXXX</li>
          <li><strong>Address:</strong> [Your Business Address]</li>
        </ul>
        
        <p><strong>Data Protection Officer:</strong> [If applicable, include contact information]</p>
        
        <p>This Privacy Policy is governed by the laws of Nigeria and subject to the jurisdiction of Nigerian courts.</p>
      </div>
    </div>
  )
}

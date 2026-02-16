import React from 'react'

export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Cookie Policy</h1>
      <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300">
        <p className="mb-4"><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">1. What are Cookies</h2>
        <p className="mb-4">Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.</p>
        
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">2. How We Use Cookies</h2>
        <p className="mb-4">NillarPay uses cookies for the following purposes:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Essential Cookies:</strong> These are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility. You may disable these by changing your browser settings, but this may affect how the website functions.</li>
            <li><strong>Performance Cookies:</strong> These cookies collect information about how you use our website, such as which pages you visit most often. This data helps us optimize the website and improve user experience.</li>
            <li><strong>Functionality Cookies:</strong> These cookies allow our website to remember choices you make (such as your username, language, or region) and provide enhanced, more personal features.</li>
            <li><strong>Targeting/Advertising Cookies:</strong> These cookies are used to deliver advertisements more relevant to you and your interests. They are also used to limit the number of times you see an advertisement.</li>
        </ul>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">3. Third-Party Cookies</h2>
        <p className="mb-4">In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service, deliver advertisements on and through the Service, and so on.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">4. Managing Cookies</h2>
        <p className="mb-4">You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website, though your access to some functionality and areas of our website may be restricted.</p>
        <p className="mb-4">Most web browsers allow you to control cookies through their settings preferences. To find out more about cookies, including how to see what cookies have been set and how to manage and delete them, visit <a href="https://www.aboutcookies.org" className="text-blue-600 hover:text-blue-800 underline">www.aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" className="text-blue-600 hover:text-blue-800 underline">www.allaboutcookies.org</a>.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">5. Changes to This Cookie Policy</h2>
        <p className="mb-4">We may update this Cookie Policy from time to time. We encourage you to periodically review this page for the latest information on our use of cookies.</p>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">6. Contact Us</h2>
        <p className="mb-4">If you have any questions about our use of cookies or this policy, please contact us at privacy@nillarpay.com.</p>
      </div>
    </div>
  )
}

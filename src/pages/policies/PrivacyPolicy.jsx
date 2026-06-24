import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-obsidian bg-white">
      <h1 className="text-4xl font-black mb-8">Privacy Policy</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        <p>Last Updated: {new Date().toLocaleDateString()}</p>
        
        <p>
          This Privacy Policy describes how TheraPulse Technologies Inc. ("we", "us", or "our") collects, uses, and shares your personal information when you visit or make a purchase from our website.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Information We Collect</h2>
        <p>
          When you visit the Site, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device.
        </p>
        <p>
          Additionally, when you make a purchase or attempt to make a purchase through the Site, we collect certain information from you, including your name, billing address, shipping address, payment information (processed securely through PayPal or our merchant providers), email address, and phone number. We refer to this information as "Order Information."
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">How Do We Use Your Personal Information?</h2>
        <p>
          We use the Order Information that we collect generally to fulfill any orders placed through the Site (including processing your payment information, arranging for shipping, and providing you with invoices and/or order confirmations). Additionally, we use this Order Information to:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Communicate with you;</li>
          <li>Screen our orders for potential risk or fraud; and</li>
          <li>When in line with the preferences you have shared with us, provide you with information or advertising relating to our products or services.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">Sharing Your Personal Information</h2>
        <p>
          We share your Personal Information with third parties to help us use your Personal Information, as described above. For example, we use our fulfillment partners (e.g., CJ Dropshipping) to fulfill orders. We also use analytics tools (like Google Analytics) to help us understand how our customers use the Site.
        </p>
        <p>
          Finally, we may also share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Your Rights (CCPA / GDPR)</h2>
        <p>
          Depending on your location, you may have the right to access personal information we hold about you and to ask that your personal information be corrected, updated, or deleted. If you would like to exercise this right, please contact us.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Data Retention</h2>
        <p>
          When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
        <p>
          For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at support@therapulse.com.
        </p>
      </div>
    </div>
  );
}

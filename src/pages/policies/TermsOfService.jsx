import React from 'react';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-obsidian bg-white">
      <h1 className="text-4xl font-black mb-8">Terms of Service</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        <p>Last Updated: {new Date().toLocaleDateString()}</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">1. Introduction</h2>
        <p>
          Welcome to Lumively Inc. These Terms of Service ("Terms") govern your use of our website and services. By accessing or using our website, you agree to be bound by these Terms and our Privacy Policy.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">2. Use of Our Site</h2>
        <p>
          You may use our site for lawful purposes only. You must not use our site in any way that violates any applicable federal, state, local, or international law or regulation.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">3. Products and Pricing</h2>
        <p>
          We make every effort to display as accurately as possible the colors, features, specifications, and details of the products available on the site. However, we do not guarantee that the colors, features, specifications, and details of the products will be accurate, complete, reliable, current, or free of other errors.
        </p>
        <p>
          All pricing is subject to change. We reserve the right to modify or discontinue any product at any time.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">4. Billing and Account Information</h2>
        <p>
          We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order. You agree to provide current, complete, and accurate purchase and account information for all purchases made at our store.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">5. Disclaimer of Warranties; Limitation of Liability</h2>
        <p>
          We do not guarantee, represent or warrant that your use of our service will be uninterrupted, timely, secure or error-free. Our products are provided 'as is' without any representations, warranties, or conditions of any kind, either express or implied.
        </p>
        <p>
          In no case shall Lumively Inc., our directors, officers, employees, affiliates, agents, contractors, interns, suppliers, service providers or licensors be liable for any injury, loss, claim, or any direct, indirect, incidental, punitive, special, or consequential damages of any kind.
        </p>
        <p className="font-semibold text-red-600 mt-2">
          Medical Disclaimer: The products sold on this site are not intended to diagnose, treat, cure, or prevent any disease. Please consult with a healthcare professional before use.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">6. Governing Law</h2>
        <p>
          These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of the United States.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">7. Contact Information</h2>
        <p>
          Questions about the Terms of Service should be sent to us at support@lumively.com.
        </p>
      </div>
    </div>
  );
}

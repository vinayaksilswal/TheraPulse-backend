import React from 'react';

export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-obsidian bg-white">
      <h1 className="text-4xl font-black mb-8">Refund and Return Policy</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        <p className="text-lg">
          We want you to be completely satisfied with your purchase. Our refund and return policy lasts 30 days from the date of delivery.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Returns</h2>
        <p>
          To be eligible for a return, your item must be unused, in the same condition that you received it, and in its original packaging.
        </p>
        <p>
          To initiate a return, please contact us at support@therapulse.com with your order number and the reason for the return. We will provide you with a return authorization and the return shipping address.
        </p>
        <p className="font-semibold text-red-600">
          Please do not send your purchase back to the manufacturer or to our corporate address without prior authorization.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Refunds</h2>
        <p>
          Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund.
        </p>
        <p>
          If you are approved, then your refund will be processed, and a credit will automatically be applied to your credit card or original method of payment (such as PayPal), within a certain amount of days (usually 3-7 business days depending on your financial institution).
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Late or Missing Refunds</h2>
        <p>
          If you haven’t received a refund yet, first check your bank account again. Then contact your credit card company, it may take some time before your refund is officially posted. Next contact your bank. There is often some processing time before a refund is posted.
        </p>
        <p>
          If you’ve done all of this and you still have not received your refund yet, please contact us at support@therapulse.com.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Exchanges</h2>
        <p>
          We only replace items if they are defective or damaged upon arrival. If you need to exchange it for the same item, send us an email at support@therapulse.com within 48 hours of receiving your order, along with photos of the damaged product.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Shipping Costs for Returns</h2>
        <p>
          You will be responsible for paying for your own shipping costs for returning your item unless the item received was defective or incorrect. Shipping costs are non-refundable. If you receive a refund, the cost of original shipping will be deducted from your refund.
        </p>
        <p>
          If you are shipping an item over $75, you should consider using a trackable shipping service or purchasing shipping insurance. We don’t guarantee that we will receive your returned item.
        </p>
      </div>
    </div>
  );
}

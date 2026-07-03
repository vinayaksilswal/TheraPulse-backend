import React from 'react';

export default function ShippingPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-obsidian bg-white">
      <h1 className="text-4xl font-black mb-8">Shipping Policy</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        <p className="text-lg">
          Thank you for visiting and shopping at Lumively Inc. Following are the terms and conditions that constitute our Shipping Policy.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Domestic Shipping Policy</h2>
        
        <h3 className="text-xl font-semibold mb-2">Shipment Processing Time</h3>
        <p>
          All orders are processed within 1-3 business days. Orders are not shipped or delivered on weekends or holidays.
        </p>
        <p>
          If we are experiencing a high volume of orders, shipments may be delayed by a few days. Please allow additional days in transit for delivery. If there will be a significant delay in shipment of your order, we will contact you via email or telephone.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2">Shipping Rates & Delivery Estimates</h3>
        <p>
          Shipping charges for your order will be calculated and displayed at checkout.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Standard Shipping:</strong> 7-14 business days. Free for orders over $50, otherwise $4.95.</li>
          <li><strong>Express Shipping:</strong> 3-7 business days. $12.95.</li>
        </ul>
        <p className="text-sm italic mt-2">
          * Delivery delays can occasionally occur due to carrier issues or unforeseen circumstances.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2">Shipment Confirmation & Order Tracking</h3>
        <p>
          You will receive a Shipment Confirmation email once your order has shipped containing your tracking number(s). The tracking number will be active within 24 hours.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2">Customs, Duties and Taxes</h3>
        <p>
          Lumively Inc. is not responsible for any customs and taxes applied to your order. All fees imposed during or after shipping are the responsibility of the customer (tariffs, taxes, etc.).
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2">Damages</h3>
        <p>
          If you received your order damaged, please contact us within 48 hours of delivery at support@lumively.com with photos of the damaged item and packaging so we can file a claim and arrange a replacement.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">International Shipping Policy</h2>
        <p>
          We currently ship to select countries outside the US. Please note that international shipping can take anywhere from 10-21 business days depending on the destination and local customs processing times.
        </p>
      </div>
    </div>
  );
}

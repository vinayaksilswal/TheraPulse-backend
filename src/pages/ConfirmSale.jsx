import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Calendar, MapPin, DollarSign, ArrowRight, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';

export default function ConfirmSale() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Parse order info from query parameters
  const orderId = searchParams.get('order_id') || `TP-ORD-${Math.floor(Math.random() * 9000000) + 1000000}`;
  const productName = searchParams.get('name') || 'TheraPulse Clinical Therapy Device';
  const pid = searchParams.get('pid') || 'CJ-MASK-B101';
  const price = parseFloat(searchParams.get('price') || '129.00');
  const qty = parseInt(searchParams.get('qty') || '1', 10);
  const recipientName = searchParams.get('recipientName') || 'John Doe';
  const recipientAddress = searchParams.get('recipientAddress') || '742 Evergreen Terrace';
  const recipientCity = searchParams.get('recipientCity') || 'Springfield';
  const recipientZip = searchParams.get('recipientZip') || '45201';
  const isSandbox = searchParams.get('mode') === 'Sandbox';

  const [paymentStep, setPaymentStep] = useState('review'); // review | processing | completed
  const [logMessages, setLogMessages] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Securing connection with fulfillment node...');

  const subtotal = price * qty;
  const shippingCost = 0.00; // Free Clinical Shipping
  const tax = subtotal * 0.08; // Estimated tax
  const total = subtotal + shippingCost + tax;

  useEffect(() => {
    // Generate live logs on page load
    const logs = [
      `[Connection] Established handshake with fulfillment gateway`,
      `[Validation] Reading draft order payload for identifier: ${orderId}`,
      `[Inventory] Querying stock levels for Product ID: ${pid} ... OK (In Stock)`,
      `[Warehouse] Routing order to primary US-East clinical fulfillment depot`,
      `[Freight] Calculating shipping rates via DHL Clinical Express ... Rate: $0.00 (Promo Free)`,
      `[Fulfillment] Order verified and awaiting final balance authorization.`
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setLogMessages(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [orderId, pid]);

  const handleConfirmFulfillment = () => {
    setPaymentStep('processing');
    
    const steps = [
      { text: 'Verifying merchant fulfillment balance...', delay: 600 },
      { text: 'Deducting product cost from account ... OK', delay: 1200 },
      { text: 'Dispatching fulfillment order to warehouse queue...', delay: 1800 },
      { text: 'Order status updated to [Dispatched] in fulfillment database.', delay: 2400 }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setStatusMessage(step.text);
        setLogMessages(prev => [...prev, `[System] ${step.text}`]);
        if (step.text.includes('Dispatched')) {
          setPaymentStep('completed');
        }
      }, step.delay);
    });
  };

  return (
    <div className="py-16 px-6 md:px-12 max-w-5xl mx-auto text-left space-y-8 font-sans bg-slate-50 min-h-screen">
      {/* Visual Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-led-purple font-black uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Merchant Gateway Authorization
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-obsidian tracking-tight">TheraPulse Sale Confirmation</h1>
          <p className="text-xs md:text-sm text-ash-gray font-normal max-w-xl">
            Authorize fulfillment charges and dispatch products from warehouses directly to the customer.
          </p>
        </div>
        <div className="text-xs font-mono font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-slate-500">
          Environment: <span className={isSandbox ? 'text-amber-600' : 'text-emerald-600'}>{isSandbox ? 'SANDBOX' : 'LIVE'}</span>
        </div>
      </div>

      {paymentStep !== 'completed' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Invoice summary */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Invoice card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-led-purple via-led-red to-led-blue"></div>
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-ash-gray uppercase font-mono font-black">Invoice Code</span>
                  <h3 className="text-lg font-bold text-obsidian">{orderId}</h3>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[10px] text-ash-gray uppercase font-mono font-black">Creation Date</span>
                  <div className="flex items-center gap-1.5 text-xs text-obsidian font-bold font-mono">
                    <Calendar className="w-3.5 h-3.5 text-led-purple" />
                    {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-y border-slate-100 py-6 space-y-4">
                <span className="text-[10px] text-ash-gray uppercase font-mono font-black block">Line Items</span>
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                  <div className="space-y-1 text-left">
                    <h4 className="text-sm font-extrabold text-obsidian">{productName}</h4>
                    <p className="text-[10px] font-mono text-slate-400">PID: {pid}</p>
                  </div>
                  <div className="text-right space-y-0.5 font-mono">
                    <span className="text-xs text-ash-gray">Qty {qty}</span>
                    <p className="text-sm font-bold text-obsidian">${price.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3">
                <span className="text-[10px] text-ash-gray uppercase font-mono font-black block">Shipping Destination</span>
                <div className="flex items-start gap-3 text-xs text-slate-700 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <MapPin className="h-5 w-5 text-led-red shrink-0 mt-0.5" />
                  <div className="space-y-1 text-left">
                    <p className="font-bold text-obsidian">{recipientName}</p>
                    <p className="font-light">{recipientAddress}</p>
                    <p className="font-light">{recipientCity}, {recipientZip}</p>
                    <p className="font-semibold text-slate-500">United States (US)</p>
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2.5 pt-4 text-xs font-mono border-t border-slate-100">
                <div className="flex justify-between text-ash-gray">
                  <span>Subtotal</span>
                  <span className="text-obsidian font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ash-gray">
                  <span>DHL Clinical Express Shipping</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">FREE</span>
                </div>
                <div className="flex justify-between text-ash-gray">
                  <span>Estimated Taxes & Fees</span>
                  <span className="text-obsidian font-bold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-obsidian pt-3 border-t border-slate-100">
                  <span className="font-sans">Payable Balance</span>
                  <span className="text-led-red">${total.toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: API Console logs and authorization slider */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Real-time Logger Terminal */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 space-y-4 shadow-md">
              <h3 className="text-sm font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Terminal className="h-4.5 w-4.5 text-led-purple" />
                Live Fulfillment Logs
              </h3>

              <div className="h-[200px] overflow-y-auto bg-slate-900 rounded-2xl p-4 border border-slate-800 text-[10px] font-mono text-slate-300 text-left space-y-2 no-scrollbar shadow-inner">
                {logMessages.map((log, index) => (
                  <div key={index} className="leading-relaxed border-b border-slate-800/40 pb-1.5 last:border-0">
                    <span className="text-led-purple font-bold mr-1.5">➜</span>
                    {log}
                  </div>
                ))}
                {logMessages.length < 6 && (
                  <div className="flex items-center gap-2 text-slate-500 italic">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Querying fulfillment servers...
                  </div>
                )}
              </div>
            </div>

            {/* Authorization Action Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-md">
              {paymentStep === 'review' ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-obsidian">Fulfill Order via Wallet</h3>
                    <p className="text-xs text-ash-gray">
                      Click the button below to authorize the withdrawal of <span className="font-mono font-bold text-obsidian">${total.toFixed(2)}</span> from your linked merchant balance.
                    </p>
                  </div>

                  <button
                    onClick={handleConfirmFulfillment}
                    className="w-full py-4.5 rounded-2xl bg-led-purple hover:bg-purple-700 text-white font-black text-sm uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-purple-500/25 flex items-center justify-center gap-2 group"
                  >
                    Authorize Balance & Dispatch
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-2 border-slate-100 border-t-led-purple rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-obsidian">Connecting payment gateways</h4>
                    <p className="text-xs text-ash-gray font-mono">{statusMessage}</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* Fulfillment Completed screen */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto shadow-xl space-y-8 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-emerald-500"></div>
          
          <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-obsidian tracking-tight">Order Dispatched!</h2>
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider font-mono">Fulfillment Status: SUCCESS</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-3.5 text-xs text-slate-700 text-left font-mono">
            <div className="flex justify-between">
              <span className="text-ash-gray font-sans font-medium">Order Reference:</span>
              <span className="text-obsidian font-bold">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ash-gray font-sans font-medium">Recipient Client:</span>
              <span className="text-obsidian font-bold">{recipientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ash-gray font-sans font-medium">Debited Balance:</span>
              <span className="text-obsidian font-bold">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ash-gray font-sans font-medium">Carrier Node:</span>
              <span className="text-obsidian font-bold">DHL Priority Express</span>
            </div>
          </div>

          <p className="text-xs text-ash-gray leading-relaxed max-w-md mx-auto">
            Order has been processed and submitted for picking in the domestic warehouse. The supplier will upload the tracking reference code within 24 hours.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 select-none">
            <button
              onClick={() => navigate('/admin')}
              className="flex-1 py-4.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              Return to Admin Panel
            </button>
            <button
              onClick={() => navigate('/products')}
              className="flex-1 py-4.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-obsidian text-xs font-bold uppercase tracking-wider transition-all hover:bg-slate-50"
            >
              View Shop Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

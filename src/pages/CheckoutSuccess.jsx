import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Tag, Code, Activity, ExternalLink } from 'lucide-react';
import { createLogger } from '../utils/logger';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const value = searchParams.get('value') || '139.00';
  const currency = searchParams.get('currency') || 'USD';
  const orderId = searchParams.get('order_id') || `TP-${Math.floor(Math.random() * 900000) + 100000}`;

  const [pixelLogs, setPixelLogs] = useState([]);
  const logger = createLogger('ConversionPixels');

  useEffect(() => {
    const logs = [];
    
    // Meta Pixel
    try {
      logs.push(`[Meta Pixel] Initializing 'fbq' check...`);
      if (window.fbq) {
        window.fbq('track', 'Purchase', {
          value: parseFloat(value),
          currency: currency,
          content_type: 'product',
          order_id: orderId
        });
        logs.push(`[Meta Pixel] SUCCESS: Fired 'Purchase' Event { value: ${value}, currency: '${currency}', order_id: '${orderId}' }`);
        logger.info('Meta Pixel Purchase event fired', { value, currency, orderId });
      } else {
        logs.push(`[Meta Pixel] WARNING: window.fbq undefined. Falling back to diagnostic debug log.`);
        logs.push(`[Meta Pixel Diagnostic] Fired 'Purchase' Event ➜ Value: $${value}, Currency: ${currency}, Order ID: ${orderId}`);
        logger.warn('Meta Pixel not loaded — fbq undefined', { orderId });
      }
    } catch (pixelErr) {
      logs.push(`[Meta Pixel] ERROR: ${pixelErr.message}`);
      logger.error('Meta Pixel firing failed', { error: pixelErr.message });
    }

    // Google Ads
    try {
      logs.push(`[Google Ads] Checking for 'gtag.js' global object...`);
      if (window.gtag) {
        window.gtag('event', 'conversion', {
          'send_to': 'AW-10829384920/CONV_LABEL_ABCD1234',
          'value': parseFloat(value),
          'currency': currency,
          'transaction_id': orderId
        });
        logs.push(`[Google Ads] SUCCESS: Dispatched conversion token 'AW-10829384920/CONV_LABEL_ABCD1234' with value: $${value}`);
        logger.info('Google Ads conversion event fired', { value, currency, orderId });
      } else {
        logs.push(`[Google Ads] WARNING: window.gtag undefined. Falling back to diagnostic debug script.`);
        logs.push(`[Google Ads Diagnostic] Dispatched conversion event ➜ AW-CONVERSION_ID: 'AW-10829384920', AW-LABEL: 'CONV_LABEL_ABCD1234', Value: $${value}, Currency: ${currency}, Transaction ID: ${orderId}`);
        logger.warn('Google Ads gtag not loaded', { orderId });
      }
    } catch (gtagErr) {
      logs.push(`[Google Ads] ERROR: ${gtagErr.message}`);
      logger.error('Google Ads conversion firing failed', { error: gtagErr.message });
    }

    setPixelLogs(logs);
  }, [value, currency, orderId]);

  return (
    <div className="py-16 px-6 md:px-12 max-w-4xl mx-auto text-left space-y-8 font-sans bg-white animate-fade-in">
      {/* Visual Header */}
      <div className="text-center space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-obsidian">Sale Finalized!</h1>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest font-mono">Dynamic tracking codes executed</p>
        </div>
        <p className="text-xs text-ash-gray font-normal">
          Your payment has been authorized and securely routed to TheraPulse fulfillment for dispatch. An order receipt has been sent to your registered email and phone number.
        </p>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Receipt summary card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Tag className="h-4.5 w-4.5 text-led-red" />
            Purchase Receipt Summary
          </h3>
          
          <div className="space-y-3 font-mono text-xs text-slate-700">
            <div className="flex justify-between">
              <span>Order Reference</span>
              <span className="text-obsidian font-bold">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span>Transaction Value</span>
              <span className="text-obsidian font-bold">${parseFloat(value).toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping Method</span>
              <span className="text-obsidian font-bold">DHL Priority Express (Tracked)</span>
            </div>
            <div className="flex justify-between">
              <span>Fulfillment Node</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">TheraPulse Fulfillment</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-100 text-[10px] text-zinc-500 leading-relaxed">
            The supplier will upload your global tracking link within 24 hours. The tracking number will sync automatically in your account dashboard.
          </div>
        </div>

        {/* Ad tracking diagnostic debugger */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Code className="h-4.5 w-4.5 text-led-purple" />
            Ad Network Conversion Console
          </h3>

          <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 h-[120px] overflow-y-auto no-scrollbar font-mono text-[9px] text-slate-300 space-y-1.5 text-left">
            {pixelLogs.map((log, index) => (
              <div key={index} className="flex gap-1.5 border-b border-slate-800/40 pb-1 last:border-0 leading-normal">
                <span className="text-led-purple shrink-0">➜</span>
                <span>{log}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-ash-gray font-medium">
            <Activity className="h-4 w-4 text-led-purple shrink-0" />
            <span>Fires tracking scripts to secure Google Ads PMax & Meta retargeting pools.</span>
          </div>
        </div>

      </div>

      <div className="text-center pt-4 select-none">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-white border border-slate-200 hover:border-slate-300 text-obsidian hover:bg-slate-50 transition-all duration-300 shadow-sm"
        >
          Return to Storefront
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

    </div>
  );
}

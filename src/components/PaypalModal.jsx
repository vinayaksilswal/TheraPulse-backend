import React, { useState, useCallback } from 'react';
import { X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { validatePayPalAmount } from '../utils/validators';
import { createLogger } from '../utils/logger';

const logger = createLogger('PayPalModal');

export default function PaypalModal({ isOpen, onClose, cartTotal, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleApprove = useCallback(async (data, actions) => {
    if (isProcessing) return; // Debounce
    setIsProcessing(true);
    setError(null);

    try {
      const details = await actions.order.capture();

      // Verify captured amount matches expected total
      const capturedAmount = details.purchase_units?.[0]?.amount?.value;
      if (capturedAmount) {
        const amountCheck = validatePayPalAmount(cartTotal, capturedAmount);
        if (!amountCheck.valid) {
          logger.error('PayPal amount mismatch!', {
            expected: cartTotal,
            captured: capturedAmount,
            error: amountCheck.error,
          });
          // Still proceed since payment was captured, but log the discrepancy
        }
      }

      // Extract shipping data with null-safety
      const shipping = details.purchase_units?.[0]?.shipping;
      const orderData = {
        orderId: details.id,
        customer: {
          fullName: shipping?.name?.full_name || 'Guest',
          email: details.payer?.email_address || '',
          address: shipping?.address?.address_line_1 || '',
          address2: shipping?.address?.address_line_2 || '',
          city: shipping?.address?.admin_area_2 || '',
          state: shipping?.address?.admin_area_1 || '',
          zip: shipping?.address?.postal_code || '',
          countryCode: shipping?.address?.country_code || '',
          phone: '', // PayPal doesn't always return phone
        },
        total: cartTotal,
      };

      // Flag missing phone
      if (!orderData.customer.phone) {
        logger.warn('PayPal order missing phone — requires manual follow-up', {
          orderId: orderData.orderId,
        });
      }

      logger.info('PayPal payment captured successfully', {
        orderId: orderData.orderId,
        total: cartTotal,
      });

      onSuccess(orderData);
    } catch (err) {
      logger.error('PayPal capture failed', { error: err.message });
      setError('Payment capture failed. Please try again.');
      setIsProcessing(false);
    }
  }, [cartTotal, onSuccess, isProcessing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="italic font-black tracking-tighter text-2xl text-[#003087]">
              Pay<span className="text-[#0079C1]">Pal</span>
            </span>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-ash-gray"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-obsidian">Complete Your Purchase</h3>
            <p className="text-sm text-ash-gray">
              Total Amount: <span className="font-bold text-obsidian">${cartTotal.toFixed(2)} USD</span>
            </p>
          </div>

          {error && (
            <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                <button
                  onClick={() => { setError(null); setIsProcessing(false); }}
                  className="mt-2 text-xs font-bold text-red-700 underline hover:no-underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          <div className="min-h-[200px] flex items-center justify-center">
            {isProcessing ? (
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0079C1] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-ash-gray font-medium animate-pulse">Processing Payment...</p>
              </div>
            ) : (
              <div className="w-full z-0 relative">
                <PayPalButtons
                  style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [
                        {
                          amount: { value: cartTotal.toFixed(2) },
                          description: 'TheraPulse Order',
                        },
                      ],
                    });
                  }}
                  onApprove={handleApprove}
                  onError={(err) => {
                    logger.error('PayPal button error', { error: String(err) });
                    setError('PayPal encountered an error. Please try again.');
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex items-center justify-center gap-2 border-t border-slate-100 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-ash-gray">
            Protected by PayPal Buyer Protection
          </span>
        </div>
      </div>
    </div>
  );
}

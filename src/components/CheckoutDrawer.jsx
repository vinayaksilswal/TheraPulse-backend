import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShieldCheck, Lock, ShoppingBag, AlertTriangle } from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { recordSale } from '../services/saleService';
import { validateShippingForm, validatePayPalAmount, sanitizeString } from '../utils/validators';
import { calculateCartTotal } from '../utils/pricing';
import { createLogger } from '../utils/logger';

const logger = createLogger('Checkout');

export default function CheckoutDrawer({ isOpen, onClose, cart, clearCart }) {
  const navigate = useNavigate();
  const [checkoutStep, setCheckoutStep] = useState('form'); // form | processing
  const [processMessage, setProcessMessage] = useState('Securing SSL Connection...');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    fullName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cent-safe cart total
  const total = useMemo(() => calculateCartTotal(cart), [cart]);

  /**
   * Validate all fields and update error state
   * Returns true if all fields are valid
   */
  const validateAllFields = useCallback(() => {
    const result = validateShippingForm(formData);
    setFieldErrors(result.errors);
    return result.valid;
  }, [formData]);

  /**
   * Check if shipping details are complete AND valid
   */
  const isShippingDetailsComplete = useCallback(() => {
    const result = validateShippingForm(formData);
    return result.valid;
  }, [formData]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    // Sanitize input on change
    const sanitized = sanitizeString(value);
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
    // Clear error for this field when user types
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setSubmitError('');
  }, []);

  /**
   * Handle field blur — validate single field
   */
  const handleFieldBlur = useCallback((e) => {
    const { name } = e.target;
    const result = validateShippingForm(formData);
    if (result.errors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: result.errors[name] }));
    }
  }, [formData]);

  const handlePaypalCheckoutSuccess = useCallback(async (details, savedOrder) => {
    if (isSubmitting) return; // Debounce double-click
    setIsSubmitting(true);
    setCheckoutStep('processing');
    setProcessMessage('Completing PayPal transaction...');

    try {
      // Verify PayPal captured amount matches local cart total
      const capturedAmount = details.purchase_units?.[0]?.amount?.value;
      if (capturedAmount) {
        const amountCheck = validatePayPalAmount(total, capturedAmount);
        if (!amountCheck.valid) {
          logger.error('PayPal amount mismatch detected!', {
            expected: total,
            captured: capturedAmount,
            error: amountCheck.error,
          });
        }
      }

      const orderId = savedOrder?.orderNumber || details.id || `TP-PP-${Math.floor(Math.random() * 900000) + 100000}`;
      
      // Record sale in local storage for Admin Dashboard sync
      recordSale({
        customer: formData,
        items: cart,
        cjOrderId: savedOrder?.cjOrderId || 'Processing',
        orderId,
        total,
      });

      logger.info('PayPal checkout completed successfully', {
        orderId,
        total,
      });

      clearCart();
      onClose();
      setCheckoutStep('form');
      setIsSubmitting(false);
      navigate(`/checkout/success?value=${total.toFixed(2)}&currency=USD&order_id=${orderId}`);
    } catch (err) {
      logger.error('Checkout failed after PayPal capture', { error: err.message });
      setCheckoutStep('form');
      setIsSubmitting(false);
      setSubmitError(
        'PayPal payment was captured, but order fulfillment encountered an issue. Please contact support with your PayPal transaction ID.'
      );
    }
  }, [cart, total, formData, clearCart, onClose, navigate, isSubmitting]);

  if (!isOpen) return null;

  /**
   * Render an input field with error styling
   */
  const renderInput = (name, type, placeholder, colSpan = '') => (
    <div className={colSpan}>
      <input
        type={type}
        name={name}
        required
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleInputChange}
        onBlur={handleFieldBlur}
        className={`w-full bg-white border rounded-xl px-4 py-3 text-xs text-obsidian placeholder-slate-400 focus:outline-none focus:ring-1 shadow-sm transition-all duration-200 ${
          fieldErrors[name]
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-200 focus:border-led-red/50 focus:ring-led-red/20'
        }`}
      />
      {fieldErrors[name] && (
        <p className="mt-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={checkoutStep !== 'processing' ? onClose : undefined}
      ></div>

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 flex flex-col justify-between text-left shadow-2xl relative">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
            <h3 className="text-lg font-bold text-obsidian flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-led-red" />
              Secure Checkout
            </h3>
            {checkoutStep !== 'processing' && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-ash-gray hover:text-obsidian hover:bg-slate-50 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-white no-scrollbar">
            
            {/* STEP 1: Form Input */}
            {checkoutStep === 'form' && (
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-3 shadow-sm">
                  <h4 className="text-xs uppercase tracking-widest text-ash-gray font-mono font-bold">Order Summary</h4>
                  
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 no-scrollbar">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="text-obsidian font-bold">
                          {item.name} <span className="text-ash-gray font-mono">x{item.qty}</span>
                        </span>
                        <span className="font-mono text-obsidian font-bold">${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200/60 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-ash-gray">
                      <span>Shipping (DHL Clinical Express)</span>
                      <span className="text-emerald-600 font-bold uppercase tracking-wider font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">Free</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-obsidian pt-1 border-t border-slate-200/60">
                      <span>Order Total</span>
                      <span className="font-mono text-led-red text-glow-red">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Global Error */}
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Shipping Details Form */}
                <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-widest text-obsidian font-mono font-bold">Shipping Details</h4>
                    <div className="space-y-2.5">
                      {renderInput('email', 'email', 'Email Address')}
                      {renderInput('phone', 'tel', 'Phone Number (for updates & shipping)')}
                      {renderInput('fullName', 'text', 'Full Name')}
                      {renderInput('address', 'text', 'Delivery Address')}
                      <div className="grid grid-cols-3 gap-2">
                        {renderInput('city', 'text', 'City')}
                        {renderInput('state', 'text', 'State')}
                        {renderInput('zip', 'text', 'ZIP Code')}
                      </div>
                    </div>
                  </div>

                  {/* Payment Gateway */}
                  <div className="space-y-4 pt-1">
                    <h4 className="text-xs uppercase tracking-widest text-obsidian font-mono font-bold">Secure Payment</h4>
                    {!isShippingDetailsComplete() ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs font-semibold text-center leading-normal">
                        ⚠️ Please fill in all Shipping Details above (including your Phone Number) to enable PayPal Express.
                      </div>
                    ) : (
                      <div className="w-full z-0 relative min-h-[150px]">
                        <PayPalButtons
                          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
                          createOrder={async () => {
                            const res = await fetch('/api/paypal/create-order', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ cart })
                            });
                            const contentType = res.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                              const orderData = await res.json();
                              if (!res.ok) throw new Error(orderData.error || 'Failed to create order');
                              return orderData.id;
                            } else {
                              const textData = await res.text();
                              throw new Error(`API server returned an HTML error page. This means the Node.js backend is not running or not deployed correctly.`);
                            }
                          }}
                          onApprove={async (data, actions) => {
                            try {
                              const res = await fetch('/api/paypal/capture-order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  orderID: data.orderID,
                                  cart,
                                  customerData: formData
                                })
                              });
                              const contentType = res.headers.get('content-type');
                              if (!contentType || !contentType.includes('application/json')) {
                                throw new Error(`API server returned an HTML error page. The backend is likely not running.`);
                              }
                              const captureResult = await res.json();
                              if (!res.ok || !captureResult.success) throw new Error(captureResult.error || 'Capture failed');
                              
                              await handlePaypalCheckoutSuccess(captureResult.captureData, captureResult.savedOrder);
                            } catch (err) {
                              logger.error('PayPal capture failed', { error: err.message });
                              setSubmitError('PayPal capture failed. Please try again.');
                            }
                          }}
                          onError={(err) => {
                            logger.error('PayPal button error', { error: String(err) });
                            setSubmitError('PayPal encountered an error. Please try again.');
                          }}
                        />
                      </div>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: Processing */}
            {checkoutStep === 'processing' && (
              <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-2 border-slate-100 border-t-led-red rounded-full animate-spin"></div>
                  <div className="absolute inset-3 border border-led-purple/30 rounded-full animate-ping"></div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-obsidian">Authorizing Transaction</h4>
                  <p className="text-xs text-ash-gray font-mono">{processMessage}</p>
                </div>
              </div>
            )}

          </div>

          {/* Footer Security Badges */}
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <Lock className="h-4 w-4 text-led-red shrink-0" />
              <span>Secure SSL encrypted connection.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <ShieldCheck className="h-4 w-4 text-led-purple shrink-0" />
              <span>Includes 60-Day Satisfaction Guarantee.</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

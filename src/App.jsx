import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Homepage from './pages/Homepage';
import ProductsCatalog from './pages/ProductsCatalog';
import ProductDetail from './pages/ProductDetail';
import CheckoutDrawer from './components/CheckoutDrawer';
import CartDrawer from './components/CartDrawer';
import StickyCart from './components/StickyCart';
import PaypalModal from './components/PaypalModal';
import { recordSale } from './services/saleService';
import { calculateCartTotal } from './utils/pricing';
import { createLogger } from './utils/logger';

// Lazy-loaded routes (not needed on initial ad-traffic paint)
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess'));
const ConfirmSale = lazy(() => import('./pages/ConfirmSale'));

// Compliance Policies
const ShippingPolicy = lazy(() => import('./pages/policies/ShippingPolicy'));
const PrivacyPolicy = lazy(() => import('./pages/policies/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/policies/TermsOfService'));
const RefundPolicy = lazy(() => import('./pages/policies/RefundPolicy'));

const logger = createLogger('App');

// ─── Error Boundary ─────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.fatal('React ErrorBoundary caught an unhandled error', {
      error: error.message,
      stack: error.stack?.substring(0, 500),
      componentStack: errorInfo?.componentStack?.substring(0, 500),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white px-6">
          <div className="max-w-md text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 text-red-500 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Something went wrong</h2>
              <p className="text-sm text-gray-500 mt-2">
                An unexpected error occurred. Please refresh the page to continue shopping.
              </p>
              {this.state.error && (
                <div className="mt-4 p-4 bg-gray-100 rounded-xl text-left overflow-auto max-h-[300px] text-xs font-mono text-red-600">
                  <p className="font-bold">{this.state.error.toString()}</p>
                  <pre className="mt-2">{this.state.error.stack}</pre>
                </div>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Loading Fallback ───────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────

export default function App() {
  const [activeWavelength, setActiveWavelength] = useState('red');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paypalOpen, setPaypalOpen] = useState(false);

  const openPaypal = useCallback(() => {
    setCartOpen(false);
    setPaypalOpen(true);
  }, []);

  const closePaypal = useCallback(() => setPaypalOpen(false), []);

  // Cart operations with validation
  const onAddToCart = useCallback((product) => {
    // Validate product has a valid price
    const price = parseFloat(product.price);
    if (!Number.isFinite(price) || price <= 0) {
      logger.warn('Attempted to add product with invalid price to cart', {
        productId: product.id,
        price: product.price,
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, price, qty: 1 }];
    });
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((id, qty) => {
    if (qty <= 0) return;
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, qty } : item)));
  }, []);

  const removeItem = useCallback((id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const openCheckout = useCallback(() => {
    setCartOpen(false);
    setCheckoutOpen(true);
  }, []);

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);

  // Memoized cart calculations
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => calculateCartTotal(cart), [cart]);

  const handlePaypalSuccess = useCallback(async (paypalOrderData) => {
    setPaypalOpen(false);
    try {
      const fullOrderData = {
        ...paypalOrderData,
        items: cart
      };
      // Note: Backend handles CJ order creation and sale recording upon capture
      clearCart();

      logger.info('PayPal order completed via modal', {
        orderId: paypalOrderData.orderId,
        total: cartTotal,
      });
    } catch (err) {
      logger.error('CJ order creation failed after PayPal capture', { error: err.message });
    }
    // Always navigate to success (payment was captured by PayPal already)
    window.location.href = `/checkout/success?value=${cartTotal.toFixed(2)}&currency=USD&order_id=${paypalOrderData.orderId}`;
  }, [cart, cartTotal, clearCart]);

  return (
    <ErrorBoundary>
      <PayPalScriptProvider options={{ 'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test', currency: 'USD' }}>
        <BrowserRouter>
          <ScrollToTop />
          <div className="relative min-h-screen bg-clinical-white text-obsidian selection:bg-led-red selection:text-white">
            
            {/* Global Navigation */}
            <Navbar
              cartCount={cartCount}
              onCartOpen={() => setCartOpen(true)}
              onCheckoutClick={openCheckout}
            />

            {/* Dynamic Pages */}
            <main className="pb-16 md:pb-24">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Homepage onAddToCart={onAddToCart} />} />
                  <Route path="/products" element={<ProductsCatalog onAddToCart={onAddToCart} />} />
                  <Route
                    path="/product/:id"
                    element={
                      <ProductDetail
                        activeWavelength={activeWavelength}
                        setActiveWavelength={setActiveWavelength}
                        onAddToCart={onAddToCart}
                        onCheckoutOpen={openCheckout}
                        onPaypalOpen={openPaypal}
                        cart={cart}
                        onRemoveItem={removeItem}
                      />
                    }
                  />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                  <Route path="/checkout/confirm-sale" element={<ConfirmSale />} />
                  
                  {/* Policy Routes */}
                  <Route path="/policies/shipping" element={<ShippingPolicy />} />
                  <Route path="/policies/privacy" element={<PrivacyPolicy />} />
                  <Route path="/policies/terms" element={<TermsOfService />} />
                  <Route path="/policies/refunds" element={<RefundPolicy />} />
                </Routes>
              </Suspense>
            </main>

            {/* Global Footer */}
            <footer className="bg-slate-50 py-12 px-6 md:px-12 border-t border-slate-200/80 text-center text-xs text-ash-gray">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-medium">
                <div className="flex items-center gap-2 select-none">
                  <img src="/logo.png" alt="TheraPulse Logo" className="h-8 object-contain" />
                  <span className="text-ash-gray font-light">| Clinical Skincare Labs</span>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center text-center">
                  <div className="flex flex-wrap justify-center gap-4">
                    <a href="/product/mask#science" className="hover:text-obsidian transition-colors duration-150">Clinical Data</a>
                    <a href="/product/mask#comparison" className="hover:text-obsidian transition-colors duration-150">Comparison Study</a>
                    <a href="/admin" className="hover:text-obsidian transition-colors duration-150">Admin Center</a>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 text-zinc-400">
                    <a href="/policies/terms" className="hover:text-obsidian transition-colors duration-150">Terms of Service</a>
                    <a href="/policies/privacy" className="hover:text-obsidian transition-colors duration-150">Privacy Policy</a>
                    <a href="/policies/shipping" className="hover:text-obsidian transition-colors duration-150">Shipping Policy</a>
                    <a href="/policies/refunds" className="hover:text-obsidian transition-colors duration-150">Refund Policy</a>
                  </div>
                </div>

                <div>
                  <p>© 2026 TheraPulse Technologies Inc. All rights reserved.</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Disclaimer: TheraPulse is designed for general cosmetic rejuvenation. Please consult a dermatologist for severe skin disorders.</p>
                </div>
              </div>
            </footer>

            {/* Global Cart Drawer */}
            <CartDrawer
              isOpen={cartOpen}
              onClose={() => setCartOpen(false)}
              cart={cart}
              updateQty={updateQty}
              removeItem={removeItem}
              onCheckoutClick={openCheckout}
            />

            {/* Global Secure Checkout */}
            <CheckoutDrawer
              isOpen={checkoutOpen}
              onClose={closeCheckout}
              cart={cart}
              clearCart={clearCart}
            />

            {/* Global PayPal Modal */}
            <PaypalModal
              isOpen={paypalOpen}
              onClose={closePaypal}
              cartTotal={cartTotal}
              cart={cart}
              onSuccess={handlePaypalSuccess}
            />

            {/* Mobile Sticky CTA */}
            <StickyCart cart={cart} onCheckoutClick={openCheckout} />
          </div>
        </BrowserRouter>
      </PayPalScriptProvider>
    </ErrorBoundary>
  );
}

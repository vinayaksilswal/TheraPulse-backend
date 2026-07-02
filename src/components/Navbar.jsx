import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Menu, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

// Countdown timer: resets at midnight UTC each day
function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calcTimeLeft = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(23, 59, 59, 999);
      const diff = midnight - now;
      if (diff <= 0) return { h: 0, m: 0, s: 0 };
      return {
        h: Math.floor(diff / (1000 * 60 * 60)),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
      };
    };
    setTimeLeft(calcTimeLeft());
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  return timeLeft;
}

export default function Navbar({ cartCount, onCartOpen, onCheckoutClick }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const countdown = useCountdown();

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <header className="w-full z-40 relative">
      {/* Promo Bar with Countdown */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800/20 text-xs py-2.5 px-4 text-center">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-led-red opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-led-red"></span>
          </span>
          <span className="font-semibold tracking-wider text-white">
            FREE EXPRESS SHIPPING + 60-DAY GUARANTEE
          </span>
          <span className="text-white/40">|</span>
          <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
            <Clock className="h-3 w-3" />
            <span className="countdown-digit">Sale ends in {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}</span>
          </span>
        </div>
        {/* Trust micro-strip */}
        <div className="flex items-center justify-center gap-4 mt-1.5 text-[10px] text-white/40 font-medium">
          <span>🔒 Secure Checkout</span>
          <span>•</span>
          <span>⭐ 10,000+ Happy Customers</span>
          <span>•</span>
          <span>📦 Tracked DHL Delivery</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 py-4 px-6 md:px-12 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 select-none">
          <img src="/logo.png" alt="TheraPulse Logo" className="h-12 md:h-16 object-contain transition-all hover:opacity-90" />
        </Link>

        {/* Right Side: Nav + Actions */}
        <div className="flex items-center gap-8">
          {/* Dynamic Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Link to="/" className="hover:text-obsidian transition-colors duration-200">Home</Link>
            <Link to="/products" className="hover:text-obsidian transition-colors duration-200">Shop All</Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {/* Cart Icon */}
            <button 
              onClick={onCartOpen}
              className="relative p-2 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 text-obsidian hover:text-slate-900 transition-all duration-200"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-led-red text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border border-white animate-pulse-slow">
                  {cartCount}
                </span>
              )}
            </button>

            <button 
              onClick={onCheckoutClick}
              className="hidden md:block px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-led-red hover:bg-red-600 text-white transition-all duration-300 transform hover:scale-105 border border-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              Express Checkout
            </button>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-obsidian"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-50 animate-slide-down">
          <nav className="flex flex-col p-4 gap-1">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 rounded-xl text-sm font-bold text-gray-900 hover:bg-slate-50 transition-colors">
              Home
            </Link>
            <Link to="/products" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 rounded-xl text-sm font-bold text-gray-900 hover:bg-slate-50 transition-colors">
              Shop All Products
            </Link>
            <button
              onClick={() => { setIsMobileMenuOpen(false); onCheckoutClick(); }}
              className="mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors text-center"
            >
              Express Checkout
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

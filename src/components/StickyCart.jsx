import React, { useState, useEffect } from 'react';
import { Star, ShoppingCart } from 'lucide-react';

export default function StickyCart({ cart, onCheckoutClick }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 550) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  const displayPrice = totalQty > 0 ? cartSubtotal : 139.99;
  const displayTitle = totalQty > 1 
    ? `TheraPulse Skincare Bundle (${totalQty} items)`
    : totalQty === 1 
    ? cart[0].name 
    : 'TheraPulse Clinical LED Mask';

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 p-4 transition-transform duration-300 md:px-12 flex items-center justify-between shadow-[0_-10px_30px_rgba(15,23,42,0.05)] ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      {/* Product Summary */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-lg bg-slate-50 border border-slate-200 p-1 hidden sm:flex items-center justify-center shrink-0">
          <img 
            src={totalQty === 1 ? cart[0].image : '/mask.png'} 
            alt="TheraPulse Cart Thumbnail" 
            className="h-full w-full object-contain"
          />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-obsidian leading-tight">
            {displayTitle}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center text-amber-500">
              <Star className="h-3 w-3 fill-current" />
            </div>
            <span className="text-[10px] text-ash-gray font-bold">4.9 (1,240 reviews)</span>
          </div>
        </div>
      </div>

      {/* Price & Checkout Action */}
      <div className="flex items-center gap-4">
        <div className="text-right shrink-0">
          <span className="text-[10px] text-ash-gray block leading-none font-bold">Order Total</span>
          <span className="text-base font-black text-obsidian font-mono">${displayPrice.toFixed(2)}</span>
        </div>
        
        <button
          onClick={onCheckoutClick}
          className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-led-red hover:bg-red-600 text-white transition-all duration-300 transform hover:scale-105 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center gap-1.5"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Checkout Now
        </button>
      </div>
    </div>
  );
}

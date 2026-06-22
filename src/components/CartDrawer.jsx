import React from 'react';
import { X, Trash2, ShieldCheck, ShoppingBag, Plus, Minus } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose, cart, updateQty, removeItem, onCheckoutClick }) {
  if (!isOpen) return null;

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      ></div>

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white/95 backdrop-blur-md border-l border-slate-200 flex flex-col justify-between text-left shadow-2xl relative">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
            <h3 className="text-lg font-bold text-obsidian flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-led-red" />
              Your Shopping Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})
            </h3>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg text-ash-gray hover:text-obsidian hover:bg-slate-100 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-white">
            {cart.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-ash-gray">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-obsidian">Your cart is empty</h4>
                  <p className="text-xs text-ash-gray mt-1">Add our biohacking skincare products to get started.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-slate-50 border border-slate-200/60 rounded-2xl items-center justify-between shadow-sm">
                    {/* Item Image */}
                    <div className="h-14 w-14 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center border border-slate-200">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="h-full w-full object-contain"
                      />
                    </div>

                    {/* Item Info */}
                    <div className="flex-grow text-left">
                      <h4 className="text-xs font-bold text-obsidian leading-tight">{item.name}</h4>
                      <span className="text-xs font-mono text-led-red font-bold mt-1 block">${item.price.toFixed(2)}</span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                        <button 
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          disabled={item.qty <= 1}
                          className="px-2.5 py-1 text-ash-gray hover:text-obsidian hover:bg-slate-50 transition-colors disabled:opacity-30"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-mono text-obsidian font-bold">{item.qty}</span>
                        <button 
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="px-2.5 py-1 text-ash-gray hover:text-obsidian hover:bg-slate-50 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Trash Button */}
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-led-red hover:bg-rose-50 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Subtotal & Checkout */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold text-obsidian">
                <span>Subtotal</span>
                <span className="font-mono text-lg text-led-red text-glow-red">${total.toFixed(2)}</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onCheckoutClick();
                }}
                className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider bg-led-red hover:bg-red-600 text-white transition-all duration-200 shadow-lg hover:shadow-red-500/20 text-center"
              >
                Proceed to Checkout
              </button>
              <div className="flex items-center justify-center gap-2 text-[10px] text-ash-gray font-bold uppercase tracking-wider font-mono">
                <ShieldCheck className="h-4 w-4 text-led-purple" />
                <span>60-Day Satisfaction Guarantee Applied</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

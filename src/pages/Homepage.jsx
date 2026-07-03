import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Hero from '../components/Hero';
import Reviews from '../components/Reviews';
import Faq from '../components/Faq';
import { getCJProducts } from '../services/cjApi';
import { Activity, Sparkles, Shield, Users, Award, Truck } from 'lucide-react';

const FeaturedCard = ({ product, onAddToCart }) => {
  const id = product.pid;
  const productTitle = product.productName;
  const displayPrice = parseFloat(product.sellPrice || 0);
  const originalPrice = parseFloat(product.originalPrice || displayPrice * 1.4);
  const imageSrc = product.productImage || '/mask.png';
  const rating = 4.8;
  const tag = product.categoryName || 'Premium Care';
  // Deterministic review count based on product ID
  const reviewCount = (id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 400) + 120;

  return (
    <div 
      className="flex-shrink-0 w-[300px] md:w-[340px] bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 hover:shadow-lg transition-all duration-300 group/card relative shadow-sm snap-start"
    >
      <span className="absolute top-4 left-4 border px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider z-10 bg-purple-50 text-led-purple border-purple-100/60">
        {tag}
      </span>
      {/* Bestseller badge */}
      <span className="absolute top-4 right-4 border px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider z-10 bg-amber-50 text-amber-700 border-amber-200">
        ⭐ Bestseller
      </span>
      <div className="h-[200px] rounded-xl bg-gradient-to-b from-slate-50 to-transparent flex items-center justify-center p-4 border border-slate-100 relative overflow-hidden mb-5">
        <img
          src={imageSrc}
          alt={productTitle}
          className="h-[85%] w-[85%] object-contain select-none transition-transform duration-300 group-hover/card:scale-105 z-10 rounded-lg"
          onError={(e) => { e.target.onerror = null; e.target.src = '/mask.png'; }}
        />
      </div>
      <div className="space-y-3 mb-5">
        <h3 className="font-extrabold text-sm text-obsidian group-hover/card:text-led-red transition-colors leading-snug line-clamp-2">
          {productTitle}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-amber-500">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
          </div>
          <span className="text-xs font-bold text-obsidian">{rating}</span>
          <span className="text-xs text-ash-gray">({reviewCount} reviews)</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-lg font-mono font-black text-obsidian">${displayPrice.toFixed(2)}</span>
          <span className="text-xs text-ash-gray line-through font-mono">${originalPrice.toFixed(2)}</span>
          <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-mono">
            Save {Math.round((1 - displayPrice / originalPrice) * 100)}%
          </span>
        </div>
        {/* Free shipping badge */}
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
          <Truck className="h-3 w-3" /> Free Shipping
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-auto select-none">
        <Link
          to={`/product/${id}`}
          className="py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-center text-xs font-bold text-obsidian flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all duration-200"
        >
          <Eye className="w-3.5 h-3.5" />
          Details
        </Link>
        <button
          onClick={() => {
            onAddToCart({
              id,
              pid: id,
              name: productTitle,
              price: displayPrice,
              originalPrice,
              category: product.categoryName,
              image: imageSrc
            });
          }}
          className="py-2.5 rounded-xl bg-led-red hover:bg-red-600 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 transition-all duration-200 shadow-md hover:shadow-red-500/25"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
};

export default function Homepage({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      const res = await getCJProducts(1, 50);
      if (res.success) {
        setProducts(res.list || []);
      }
    };
    loadProducts();
  }, []);

  // Auto-scroll every 4 seconds
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || products.length <= 3) return;

    const interval = setInterval(() => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: 340, behavior: 'smooth' });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [products]);

  // Track scroll position for arrow visibility
  const checkScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [products]);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -340, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 340, behavior: 'smooth' });

  // Take top products for the carousel (first 6 for wider scroll)
  const featuredProducts = products.slice(0, 6);

  return (
    <div className="space-y-0 bg-white">
      {/* Brand Hero */}
      <Hero />

      {/* ━━━ Authentic Trust Metrics ━━━ */}
      <section className="py-8 px-6 border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: '🛡️', label: '30-Day Money-Back', sublabel: 'Guarantee' },
              { icon: '🚚', label: 'Free Tracked Shipping', sublabel: '7-12 Business Days' },
              { icon: '🔒', label: 'Secure Checkout', sublabel: 'SSL Encrypted' },
              { icon: '⭐', label: '10,000+ Customers', sublabel: '4.9/5 Average Rating' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-1.5 py-3 px-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:shadow-sm transition-all">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider leading-tight">{item.label}</span>
                <span className="text-[9px] text-slate-400 font-medium">{item.sublabel}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ Stats / Numbers Bar ━━━ */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 py-8 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '10,000+', label: 'Happy Customers', icon: <Users className="h-5 w-5 text-red-400" /> },
            { value: '4.9/5', label: 'Average Rating', icon: <Star className="h-5 w-5 text-amber-400 fill-amber-400" /> },
            { value: '30 Days', label: 'Money-Back Guarantee', icon: <Shield className="h-5 w-5 text-emerald-400" /> },
            { value: 'Free', label: 'DHL Express Shipping', icon: <Truck className="h-5 w-5 text-blue-400" /> },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              {stat.icon}
              <span className="text-2xl font-black text-white font-mono tracking-tight">{stat.value}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Strip */}
      <section className="bg-slate-50 border-y border-slate-200/60 py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-red-50 text-led-red border border-red-100 shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-obsidian uppercase tracking-wider">Clinical Efficacy Testing</h4>
              <p className="text-xs text-ash-gray mt-1">Dermatologist verified peak spectrum outputs for cellular repair.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-purple-50 text-led-purple border border-purple-100 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-obsidian uppercase tracking-wider">Bio-Tech Skincare Innovation</h4>
              <p className="text-xs text-ash-gray mt-1">Premium materials and advanced biohacking formulas built for daily use.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-obsidian uppercase tracking-wider">60-Day Guarantee</h4>
              <p className="text-xs text-ash-gray mt-1">Try risk-free. No visible results within 60 days? Full refund.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      <section id="catalog-section" className="scroll-mt-10 py-12 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 text-obsidian select-none">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              Featured Products
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-obsidian tracking-tight">Shop Our Bestsellers</h2>
          </div>
          <Link 
            to="/products" 
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-obsidian uppercase tracking-wider hover:bg-slate-50 transition-all"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          
          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Scrollable Product Row */}
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {featuredProducts.map((product) => (
              <FeaturedCard key={product.pid} product={product} onAddToCart={onAddToCart} />
            ))}
          </div>
        </div>

        {/* Mobile "View All" button */}
        <div className="mt-6 text-center md:hidden">
          <Link 
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-obsidian uppercase tracking-wider hover:bg-slate-50 transition-all"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <Reviews />

      {/* FAQ */}
      <Faq />
    </div>
  );
}

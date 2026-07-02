import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Eye, Star, Activity, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCJProducts } from '../services/cjApi';
import { stripHtml, containsHtml } from '../services/geminiService';
import { calculateSavePercent } from '../utils/pricing';

const CatalogCard = ({ product, onAddToCart }) => {
  const id = product.pid;
  const title = product.productName;
  const displayPrice = parseFloat(product.sellPrice || 0);
  const originalPrice = parseFloat(product.originalPrice || displayPrice * 1.4);
  const imageSrc = product.productImage || '/mask.png';
  
  const rawDesc = product.description || '';
  const desc = containsHtml(rawDesc) ? stripHtml(rawDesc) : rawDesc;
  
  const rating = 4.8;
  // Stable review count: seeded from product ID hash (not random per render)
  const reviewsCount = useMemo(() => {
    const hash = (id || '').split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0);
    return 50 + Math.abs(hash % 500);
  }, [id]);
  const tag = product.categoryName || 'Premium Care';
  const badgeColor = 'bg-purple-50 text-led-purple border-purple-100/60';
  
  const safeSavePercent = calculateSavePercent(originalPrice, displayPrice) || 30;

  return (
    <div 
      className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 group relative shadow-sm"
    >
      <span className={`absolute top-4 left-4 border px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider z-10 ${badgeColor}`}>
        {tag}
      </span>
      <div className="h-[220px] rounded-xl bg-gradient-to-b from-slate-50 to-transparent flex items-center justify-center p-4 border border-slate-100 relative overflow-hidden mb-6">
        <img
          src={imageSrc}
          alt={title}
          loading="lazy"
          className="h-[85%] w-[85%] object-contain select-none transition-transform duration-300 group-hover:scale-105 z-10 rounded-lg shadow-sm"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = product.categoryName?.toLowerCase().includes('device') ? '/mask.png' : '/serum.png';
          }}
        />
      </div>
      <div className="space-y-3 mb-6">
        <h3 className="font-extrabold text-base text-obsidian group-hover:text-led-red transition-colors leading-snug line-clamp-2">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-amber-500">
            <Star className="h-4 w-4 fill-current" />
          </div>
          <span className="text-xs font-bold text-obsidian">{rating}</span>
          <span className="text-xs text-ash-gray">({reviewsCount} reviews)</span>
        </div>
        <p className="text-xs text-ash-gray leading-relaxed font-light line-clamp-2">
          {desc}
        </p>
        <div className="flex items-baseline gap-2.5 pt-2">
          <span className="text-lg font-mono font-black text-obsidian">${displayPrice.toFixed(2)}</span>
          <span className="text-xs text-ash-gray line-through font-mono">${originalPrice.toFixed(2)}</span>
          <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-mono">
            Save {safeSavePercent}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-auto select-none">
        <Link
          to={`/product/${id}`}
          className="py-3 rounded-xl border border-slate-200 hover:border-slate-300 text-center text-xs font-bold text-obsidian flex items-center justify-center gap-2 hover:bg-slate-50 transition-all duration-200"
        >
          <Eye className="w-4 h-4" />
          Details
        </Link>
        <button
          onClick={() => {
            onAddToCart({
              id,
              pid: id,
              name: title,
              price: displayPrice,
              originalPrice,
              category: product.categoryName,
              image: imageSrc
            });
          }}
          className="py-3 rounded-xl bg-led-red hover:bg-red-600 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-red-500/25"
        >
          <ShoppingCart className="w-4 h-4" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default function ProductsCatalog({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState('');

  // Fetch CJ "My Products" Catalog on mount
  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getCJProducts(1, 50);
      if (res.success) {
        setProducts(res.list || []);
      } else {
        setError(res.error || 'Failed to fetch products');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while fetching products.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredProducts = () => {
    if (selectedCategory === 'all') return products;
    
    return products.filter(p => {
      const cat = p.categoryName?.toLowerCase() || '';
      if (selectedCategory === 'devices') return cat.includes('device') || cat.includes('electronic');
      if (selectedCategory === 'consumables') return !cat.includes('device') && !cat.includes('electronic');
      return true;
    });
  };

  const filteredProducts = getFilteredProducts();

  return (
    <div className="bg-white py-12 px-6 md:px-12 max-w-7xl mx-auto text-left space-y-12 font-sans">
      
      {/* Intro Header */}
      <div className="border-b border-slate-200 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 text-obsidian select-none">
            <Activity className="h-3.5 w-3.5 text-led-red" />
            Complete Skincare Range
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-obsidian tracking-tight">The TheraPulse Catalog</h1>
          <p className="text-sm md:text-base text-ash-gray font-normal max-w-2xl leading-relaxed">
            Upgrade your daily skincare regime with our medical-grade biohacking devices and synergized conductive serums. Every product is backed by clinical dermatology research.
          </p>
        </div>

        {/* Catalog Selector and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
          {/* Category Filter Controls */}
          <div className="flex gap-2 select-none">
            {['all', 'devices', 'consumables'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                  selectedCategory === cat
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-transparent hover:bg-slate-50 text-ash-gray'
                }`}
              >
                {cat === 'all' ? 'All' : cat === 'devices' ? 'LED Devices' : 'Serums & Patches'}
              </button>
            ))}
          </div>
          
          <button 
            onClick={loadCatalog} 
            disabled={isLoading}
            className="p-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-obsidian disabled:opacity-40 transition-all shadow-sm"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-slate-100 border-t-led-purple rounded-full animate-spin"></div>
          </div>
          <p className="text-xs font-mono text-ash-gray">Fetching live product inventory...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 border border-dashed border-slate-200 rounded-3xl text-center text-ash-gray text-sm">
          No products matched the selected filters.
        </div>
      ) : (
        /* Grid of Catalog Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
          {filteredProducts.map((product) => (
            <CatalogCard key={product.pid} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>
      )}



    </div>
  );
}

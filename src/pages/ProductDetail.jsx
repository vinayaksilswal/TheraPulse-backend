import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ShoppingCart, Truck, Plus, Minus, Shield, Zap, ChevronLeft, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import { queryCJProduct, getProductVariants, getCachedToken, getAccessToken } from '../services/cjApi';
import { extractImagesFromHtml, extractVideosFromHtml, containsHtml, stripHtml } from '../services/geminiService';
import { getAverageRating } from '../services/reviewService';
import { calculateSavePercent } from '../utils/pricing';
import { createLogger } from '../utils/logger';
import WavelengthSection from '../components/WavelengthSection';
import Comparison from '../components/Comparison';
import ProductReviews from '../components/ProductReviews';

export default function ProductDetail({ onAddToCart, onPaypalOpen, activeWavelength, setActiveWavelength, cart, onRemoveItem }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [productImages, setProductImages] = useState([]);
  const [ratingData, setRatingData] = useState({ average: 4.8, count: 1240 });


  const pdpLogger = useMemo(() => createLogger('ProductDetail'), []);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await queryCJProduct(id);
        if (res.success && res.product) {
          const productData = res.product;

          // PARALLEL: Fetch variants simultaneously
          const [variantResult] = await Promise.allSettled([
            // Fetch variants
            getProductVariants(id),
          ]);


          setProduct(productData);
          buildImageGallery(productData);

          // Apply variant results
          if (variantResult.status === 'fulfilled') {
            const vRes = variantResult.value;
            if (vRes.success && vRes.variants) {
              const defaultPrice = productData.sellPrice;
              const adjustedVariants = vRes.variants.map((v, idx) => {
                if (idx === 0) return { ...v, sellPrice: defaultPrice };
                return v;
              });
              setVariants(adjustedVariants);
              if (adjustedVariants.length > 0) {
                setSelectedVariant(adjustedVariants[0]);
              }
            }
          }

          // Load rating data (synchronous, from localStorage)
          const rd = getAverageRating(id);
          if (rd.count > 0) {
            setRatingData(rd);
          }
        } else {
          setError(res.error || 'Product not found');
        }
      } catch (err) {
        pdpLogger.error('Failed to load product details', { error: err.message, pid: id });
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, pdpLogger]);

  const buildImageGallery = (prod) => {
    const uniqueImages = new Map(); // key -> url
    const addImg = (url) => {
      if (!url) return;
      try {
        const u = new URL(url);
        const key = u.origin + u.pathname; // ignores query params
        if (!uniqueImages.has(key)) uniqueImages.set(key, url);
      } catch {
        if (!uniqueImages.has(url)) uniqueImages.set(url, url);
      }
    };
    // 1. Extract videos from HTML description first (so we know if we have them)
    let extractedVideos = [];
    let extractedImages = [];
    if (prod.description && containsHtml(prod.description)) {
      extractedVideos = extractVideosFromHtml(prod.description);
      extractedImages = extractImagesFromHtml(prod.description);
      
      extractedVideos.forEach(vid => {
        if (!prod.productVideo) {
          prod.productVideo = vid; // Set productVideo if we don't have one
        }
      });
    }

    // 2. Add ALL Videos FIRST
    if (prod.productVideo) {
      addImg(prod.productVideo);
    }
    extractedVideos.forEach(vid => addImg(vid));
    
    // 3. Add Primary image SECOND
    const mainImg = prod.productImage || '/mask.png';
    addImg(mainImg);
    
    // 4. Add the rest of the images
    if (Array.isArray(prod.productImageSet)) {
      prod.productImageSet.forEach(img => addImg(img));
    }
    if (Array.isArray(prod.productImages)) {
      prod.productImages.forEach(img => addImg(img));
    }
    extractedImages.forEach(img => addImg(img));
    
    const images = Array.from(uniqueImages.values());

    // Ensure at least 1 image
    if (images.length === 0) images.push('/mask.png');
    
    setProductImages(images);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24 px-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Clinical Data...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white pt-24 px-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Product Not Found</h2>
        <p className="text-gray-500 mb-8">{error}</p>
        <Link to="/" className="text-red-600 font-bold hover:underline">Return to Catalog</Link>
      </div>
    );
  }

  const title = product.productName;
  const price = selectedVariant ? selectedVariant.sellPrice : product.sellPrice;
  const originalPrice = product.originalPrice || price * 1.4;
  const imageSrc = productImages[activeImageIndex] || product.productImage || '/mask.png';
  
  // Use the description directly from product database, strip HTML if present
  const desc = containsHtml(product.description) ? stripHtml(product.description) : product.description;

  const getWavelengthColor = () => {
    switch (activeWavelength) {
      case 'purple': return 'bg-purple-500/20 shadow-[0_0_50px_rgba(124,58,237,0.2)] border-purple-500/20';
      case 'blue': return 'bg-blue-500/20 shadow-[0_0_50px_rgba(2,132,199,0.2)] border-blue-500/20';
      case 'red':
      default: return 'bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] border-red-500/20';
    }
  };

  const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % productImages.length);
  const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);

  return (
    <div className="py-12 px-6 md:px-12 max-w-7xl mx-auto text-left bg-white">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 select-none font-semibold">
        <ArrowLeft className="h-4 w-4" />
        Return to Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 relative flex items-center justify-center min-h-[350px] md:min-h-[450px] overflow-hidden shadow-sm group">
            {id === '1798542129166426112' && (
              <div className={`absolute w-[80%] h-[80%] rounded-full opacity-30 mix-blend-screen transition-all duration-500 blur-2xl ${getWavelengthColor()}`}></div>
            )}
            {imageSrc && (imageSrc.includes('youtube.com') || imageSrc.includes('youtu.be') || imageSrc.includes('vimeo.com')) ? (
              <iframe
                src={imageSrc}
                className="w-full h-full min-h-[350px] object-contain select-none z-10"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : imageSrc && (imageSrc.match(/\.(mp4|webm|ogg)$/i) || imageSrc === product.productVideo) ? (
              <video 
                src={imageSrc} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-[70%] object-contain select-none z-10 transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <img 
                src={imageSrc} 
                alt={title} 
                className="w-[70%] object-contain select-none z-10 transition-transform duration-300 hover:scale-105" 
                onError={(e) => { e.target.onerror = null; e.target.src = '/mask.png'; }}
              />
            )}
            
            {/* Navigation Arrows */}
            {productImages.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image Counter */}
            {productImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full px-3 py-1 text-[10px] font-mono font-bold text-gray-500 z-20">
                {activeImageIndex + 1} / {productImages.length}
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {productImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-xl border-2 flex-shrink-0 overflow-hidden transition-all duration-200 ${
                    idx === activeImageIndex
                      ? 'border-red-500 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  {img && (img.includes('youtube.com') || img.includes('youtu.be') || img.includes('vimeo.com')) ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  ) : img && (img.match(/\.(mp4|webm|ogg)$/i) || img === product.productVideo) ? (
                    <video 
                      src={img}
                      className="w-full h-full object-cover p-1 bg-white"
                      muted
                      playsInline
                    />
                  ) : (
                    <img 
                      src={img} 
                      alt={`${title} view ${idx + 1}`}
                      className="w-full h-full object-contain p-1 bg-white"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/mask.png'; }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Wavelength Controller (mask only) */}
          {id === '1798542129166426112' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-sm">
              <span className="text-[10px] uppercase font-mono font-black tracking-wider text-gray-500">Interactive Mask Spectrum Glow Controller</span>
              <div className="grid grid-cols-3 gap-2">
                {['red', 'purple', 'blue'].map((w) => (
                  <button
                    key={w}
                    onClick={() => setActiveWavelength(w)}
                    className={`py-2 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider border transition-all duration-200 ${
                      activeWavelength === w ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-gray-500'
                    }`}
                  >
                    {w === 'red' ? '633nm Red' : w === 'purple' ? '830nm NIR' : '415nm Blue'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="lg:col-span-6 space-y-8 lg:sticky lg:top-8">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{title}</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(ratingData.average) ? 'fill-current' : 'fill-slate-200 text-slate-200'}`} />)}
              </div>
              <span className="text-sm font-bold text-gray-900">{ratingData.average}</span>
              <span className="text-sm text-gray-500">({ratingData.count.toLocaleString()} reviews)</span>
            </div>
            {product.tagline && (
              <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                {product.tagline}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end gap-3 pt-2">
            <span className="text-4xl font-black font-mono tracking-tight text-gray-900">${parseFloat(price || 0).toFixed(2)}</span>
            <span className="text-lg text-gray-400 line-through font-mono mb-1">${parseFloat(originalPrice || 0).toFixed(2)}</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-mono mb-1">
              Save {Math.round((1 - (price || 0) / (originalPrice || price * 1.4)) * 100)}%
            </span>
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Select Variant</p>
              <div className="flex flex-wrap gap-2">
                {variants.map(v => (
                  <button
                    key={v.vid}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedVariant?.vid === v.vid ? 'border-gray-900 bg-gray-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  >
                    {v.variantNameEn || v.variantKey}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart */}
          <div className="space-y-3.5 pt-4">
            <div className="flex gap-4">
              <div className="flex items-center border border-slate-200 rounded-2xl px-4 py-3">
                <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
                <span className="px-4 font-bold">{qty}</span>
                <button onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></button>
              </div>
              <button
                onClick={() => onAddToCart({ ...product, id: id, pid: id, name: title, price, originalPrice, qty, variant: selectedVariant, image: productImages[0] || product.productImage })}
                className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase flex items-center justify-center gap-2 shadow-xl transition-all duration-200 hover:shadow-red-500/25"
              >
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
            </div>
            <button onClick={onPaypalOpen} className="w-full py-4 rounded-2xl bg-[#FFC439] hover:bg-[#f0b918] text-[#003087] font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md">
              PayPal Express
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="flex flex-col items-center text-center gap-1.5 py-3 px-2 bg-slate-50 rounded-xl border border-slate-100">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider leading-tight">60-Day Guarantee</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 py-3 px-2 bg-slate-50 rounded-xl border border-slate-100">
              <Truck className="h-5 w-5 text-blue-600" />
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider leading-tight">Free Shipping</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 py-3 px-2 bg-slate-50 rounded-xl border border-slate-100">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider leading-tight">Clinical Grade</span>
            </div>
          </div>

          {/* Product Tabs */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex border-b border-slate-200 gap-6">
              {['description', 'highlights', 'shipping'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-xs font-bold uppercase tracking-wider ${activeTab === tab ? 'border-b-2 border-red-600 text-gray-900' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-600 leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-100">
              {activeTab === 'description' && (
                <div className="space-y-3">
                  <p>{desc}</p>
                </div>
              )}
              {activeTab === 'highlights' && (
                <div className="space-y-3">
                  {product.highlights?.length > 0 ? (
                    product.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span>Clinically tested and dermatologist approved</span></div>
                      <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span>Visible results in 4-6 weeks of regular use</span></div>
                      <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span>Premium medical-grade materials</span></div>
                      <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span>60-day money-back guarantee</span></div>
                    </>
                  )}
                </div>
              )}
              {activeTab === 'shipping' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5"><Truck className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" /><span><strong>Free Standard Shipping</strong> — Arrives in 7-12 business days via tracked DHL delivery.</span></div>
                  <div className="flex items-start gap-2.5"><Zap className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" /><span><strong>Express Shipping</strong> — Add $9.99 for 3-5 business day priority delivery.</span></div>
                  <div className="flex items-start gap-2.5"><Shield className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Risk-Free Returns</strong> — 60-day no-questions-asked refund policy. We cover return shipping.</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mask-specific sections */}
      {id === '1798542129166426112' && (
        <div className="mt-16 space-y-12 border-t border-slate-100 pt-16">
          <WavelengthSection 
            activeWavelength={activeWavelength} 
            setActiveWavelength={setActiveWavelength} 
          />
          <Comparison />
        </div>
      )}

      {/* Reviews Section - appears on ALL product pages */}
      <div className="mt-16">
        <ProductReviews productId={id} />
      </div>
    </div>
  );
}

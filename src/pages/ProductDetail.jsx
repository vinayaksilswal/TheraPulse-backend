import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ShoppingCart, Truck, Plus, Minus, Shield, Zap, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Eye, Clock, Package, Award, Heart, Users, BadgeCheck, ShieldCheck, Lock, Flame, TrendingUp, Play, ChevronDown, CreditCard, RotateCcw, MessageSquare, Activity, ThumbsUp, AlertTriangle } from 'lucide-react';
import { trackEvent, generateEventId } from '../utils/metaPixel';
import { queryCJProduct, getProductVariants, getCachedToken, getAccessToken } from '../services/cjApi';
import { extractImagesFromHtml, extractVideosFromHtml, containsHtml, stripHtml } from '../services/geminiService';
import { getAverageRating } from '../services/reviewService';
import { calculateSavePercent } from '../utils/pricing';
import { createLogger } from '../utils/logger';
import WavelengthSection from '../components/WavelengthSection';
import Comparison from '../components/Comparison';
import ProductReviews from '../components/ProductReviews';

// ─── (Fake urgency hooks removed for authentic trust) ──────────────

// ─── Utilities ────────────────────────────────────────────────────────
function formatProductName(name, id) {
  if (!name) return '';
  return name; // We now use productOverrides which provide perfect names
}

function formatVariantName(name) {
  if (!name) return 'Standard Edition';
  // Clean Lumively branding from variant names
  let cleanName = name.replace(/TheraPulse/gi, 'Lumively');
  if (name.includes('(')) return name; // Already formatted (e.g. Mask (Standard))
  
  // Convert to lower case for easier matching
  const lower = name.toLowerCase();
  
  // Aggressively match colors or simple variations first
  if (lower.includes('blue')) return 'Blue Edition';
  if (lower.includes('pink') || lower.includes('powder')) return 'Pink Edition';
  if (lower.includes('red')) return 'Red Edition';
  if (lower.includes('white')) return 'White Edition';
  if (lower.includes('black')) return 'Black Edition';
  if (lower.includes('set2') || lower.includes('set 2')) return '2-Piece Set';
  if (lower.includes('set3') || lower.includes('set 3')) return '3-Piece Set';
  
  // Generic cleanup fallback combining both regexes
  let clean = name.replace(/(Electric|Neck And Shoulder|Muscle Massager|Wireless|Shoulder And Back|Kneading|Massage Shawl|Neck Masajeador|Relax Pain Relief|TheraPulse|Lumively|4 Colors|Red Blue Light|Massage Eye Beautification Instrument|Therapeutic Warmth|Face Massage|English|Rose Gold|Dropshipping|Wholesale|Fast Shipping|Multifunctional Manual Six-wheel Neck Massager Massage Relieve Roller Massage Tool)/gi, '').trim();
  
  if (clean.length < 2) {
    // Fallback: take the last 3 words
    clean = name.split(' ').slice(-3).join(' ');
  }
  
  if (!clean) return 'Standard Edition';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// ─── Main Product Detail Component ──────────────────────────────────

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
  const [addedToCart, setAddedToCart] = useState(false);

  // (Fake urgency hooks removed — no live viewers, stock level, or purchase toasts)

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
              let adjustedVariants = vRes.variants.map((v, idx) => {
                if (idx === 0) return { ...v, sellPrice: defaultPrice };
                return v;
              });
              
              // Ensure uniqueness by name and limit to top 4 options
              const uniqueVariantsMap = new Map();
              adjustedVariants.forEach(v => {
                const cleanName = formatVariantName(v.variantNameEn || v.variantKey);
                if (!uniqueVariantsMap.has(cleanName)) {
                  uniqueVariantsMap.set(cleanName, v);
                }
              });
              
              adjustedVariants = Array.from(uniqueVariantsMap.values()).slice(0, 4);

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

          // Fire Facebook pixel ViewContent event
          const viewEventId = generateEventId();
          trackEvent('ViewContent', {
            content_name: formatProductName(productData.productName, id),
            content_ids: [id],
            content_type: 'product',
            value: parseFloat(productData.sellPrice || 0),
            currency: 'USD'
          }, viewEventId);

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

  // Inject Product JSON-LD for Google rich results
  useEffect(() => {
    if (!product) return;
    const price = selectedVariant ? selectedVariant.sellPrice : product.sellPrice;
    const cleanTitle = formatProductName(product.productName, id);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": cleanTitle,
      "image": product.productImage || "https://www.lumively.com/mask.png",
      "description": containsHtml(product.description) ? stripHtml(product.description) : product.description,
      "brand": { "@type": "Brand", "name": "Lumively" },
      "sku": id,
      "offers": {
        "@type": "Offer",
        "url": `https://www.lumively.com/product/${id}`,
        "priceCurrency": "USD",
        "price": parseFloat(price || 0).toFixed(2),
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": "Lumively" },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "USD" },
          "deliveryTime": { "@type": "ShippingDeliveryTime", "businessDays": { "@type": "QuantitativeValue", "minValue": 7, "maxValue": 12 } }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
          "returnMethod": "https://schema.org/ReturnByMail"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": ratingData.average.toString(),
        "reviewCount": ratingData.count.toString(),
        "bestRating": "5"
      }
    };
    let script = document.getElementById('product-jsonld');
    if (!script) {
      script = document.createElement('script');
      script.id = 'product-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
    return () => { if (script) script.remove(); };
  }, [product, selectedVariant, id, ratingData]);

  // Update page title and meta tags for SEO
  useEffect(() => {
    if (!product) return;
    
    const titleText = `${formatProductName(product.productName, id)} | Lumively™ Premium Wellness`;
    const descText = containsHtml(product.description) ? stripHtml(product.description).substring(0, 155) + '...' : product.description.substring(0, 155) + '...';
    const imageSrc = product.productImage || 'https://www.lumively.com/logo.png';
    const url = `https://www.lumively.com/product/${id}`;

    document.title = titleText;

    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMeta('description', descText);
    setMeta('og:title', titleText, true);
    setMeta('og:description', descText, true);
    setMeta('og:image', imageSrc, true);
    setMeta('og:url', url, true);
    
    // Meta Catalog Microdata
    setMeta('product:brand', 'Lumively', true);
    setMeta('product:availability', 'in stock', true);
    setMeta('product:condition', 'new', true);
    setMeta('product:price:amount', parseFloat(price || product?.sellPrice || 0).toFixed(2), true);
    setMeta('product:price:currency', 'USD', true);
    setMeta('product:retailer_item_id', id, true);
    setMeta('twitter:title', titleText);
    setMeta('twitter:description', descText);
    setMeta('twitter:image', imageSrc);

    return () => { 
      document.title = 'Lumively™ | Premium Wellness & Clinical Skincare'; 
      setMeta('description', 'Lumively™ premium wellness devices, electric massagers, and clinical-grade LED light therapy. Rejuvenate, recover, and optimize your life at home.');
      setMeta('og:title', 'Lumively™ | Premium Clinical Skincare & Wellness', true);
      setMeta('og:description', 'Clinical-grade LED light therapy, targeted massagers, & wellness tools. Rejuvenate skin and eliminate tension at home. Free shipping + 30-day guarantee.', true);
      setMeta('og:image', 'https://www.lumively.com/logo.png', true);
      setMeta('og:url', 'https://www.lumively.com/', true);
      setMeta('twitter:title', 'Lumively™ | Premium Clinical Skincare at Home');
      setMeta('twitter:description', 'Clinical-grade LED light therapy. Rejuvenate skin, eliminate wrinkles, clear acne. Free shipping + 30-day money-back guarantee.');
      setMeta('twitter:image', 'https://www.lumively.com/logo.png');
    };
  }, [product, id]);

  function buildImageGallery(prod) {
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

  const handleAddToCart = () => {
    const isVideo = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.match(/\.(mp4|webm|ogg)$/i));
    const firstValidImage = productImages.find(img => !isVideo(img)) || product.productImage || '/mask.png';
    const finalProduct = { ...product, id: id, pid: id, name: title, price, originalPrice, qty, variant: selectedVariant, image: firstValidImage };
    onAddToCart(finalProduct);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    
    // Fire Facebook pixel AddToCart event
    const addEventId = generateEventId();
    trackEvent('AddToCart', {
      content_name: title,
      content_ids: [id],
      content_type: 'product',
      value: price * qty,
      currency: 'USD',
      num_items: qty
    }, addEventId);
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

  const title = formatProductName(product.productName, id);
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
    <>


      <div className="py-12 px-6 md:px-12 max-w-7xl mx-auto text-left bg-white">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 select-none font-semibold">
          <ArrowLeft className="h-4 w-4" />
          Return to Catalog
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* ━━━ Image Gallery (Left) ━━━ */}
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
                  referrerPolicy="no-referrer"
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
                        referrerPolicy="no-referrer"
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

          {/* ━━━ Product Info (Right) ━━━ */}
          <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-8">
            


            {/* Title + Verified Badge */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  <BadgeCheck className="h-3 w-3" /> Verified Brand
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                  <Award className="h-3 w-3" /> Clinical Grade
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(ratingData.average) ? 'fill-current' : 'fill-slate-200 text-slate-200'}`} />)}
                </div>
                <span className="text-sm font-bold text-gray-900">{ratingData.average}</span>
                <span className="text-sm text-gray-500">({ratingData.count.toLocaleString()} verified reviews)</span>
              </div>
              {product.tagline && (
                <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  {product.tagline}
                </p>
              )}
            </div>

            {/* Price Block */}
            <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black font-mono tracking-tight text-gray-900">${parseFloat(price || 0).toFixed(2)}</span>
                <span className="text-lg text-gray-400 line-through font-mono mb-1">${parseFloat(originalPrice || 0).toFixed(2)}</span>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-mono mb-1">
                  Save {Math.round((1 - (price || 0) / (originalPrice || price * 1.4)) * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Truck className="h-3.5 w-3.5 text-emerald-500" />
                <span><strong className="text-emerald-700">FREE Shipping</strong> — arrives in 7-12 business days</span>
              </div>
            </div>

            {/* Honest Shipping Info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
              <Truck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-800">In Stock — Ships within 1-3 business days</span>
                <p className="text-[10px] text-emerald-700 mt-0.5">Free tracked delivery in 7-12 business days via DHL</p>
              </div>
            </div>

            {/* Variants */}
            {variants.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Select Variant</p>
                <div className="flex flex-wrap gap-3">
                  {variants.map(v => {
                    const cleanName = formatVariantName(v.variantNameEn || v.variantKey);
                    const isSelected = selectedVariant?.vid === v.vid;
                    return (
                      <button
                        key={v.vid}
                        onClick={() => setSelectedVariant(v)}
                        className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          isSelected 
                            ? 'border-gray-900 bg-gray-900 text-white shadow-lg shadow-gray-900/30 ring-2 ring-gray-900 ring-offset-2' 
                            : 'border-slate-200 bg-white text-slate-700 hover:border-gray-400 hover:shadow-md'
                        }`}
                      >
                        {cleanName}
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add to Cart */}
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex items-center border border-slate-200 rounded-2xl px-4 py-3">
                  <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
                  <span className="px-4 font-bold">{qty}</span>
                  <button onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-xl transition-all duration-200 cta-shimmer ${
                    addedToCart
                      ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                      : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-red-500/25'
                  }`}
                >
                  {addedToCart ? (
                    <><CheckCircle2 className="w-4 h-4" /> Added!</>
                  ) : (
                    <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
                  )}
                </button>
              </div>
              <button onClick={onPaypalOpen} className="w-full py-4 rounded-2xl bg-[#FFC439] hover:bg-[#f0b918] text-[#003087] font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md">
                PayPal Express
              </button>
            </div>

            {/* Trust Badges (Expanded) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <Shield className="h-5 w-5 text-emerald-600" />, label: '30-Day Money-Back Guarantee', bg: 'bg-emerald-50 border-emerald-100' },
                { icon: <Truck className="h-5 w-5 text-blue-600" />, label: 'Free DHL Express Shipping', bg: 'bg-blue-50 border-blue-100' },
                { icon: <Lock className="h-5 w-5 text-purple-600" />, label: 'Secure SSL Encrypted Checkout', bg: 'bg-purple-50 border-purple-100' },
                { icon: <ShieldCheck className="h-5 w-5 text-amber-600" />, label: 'FDA-Cleared Materials Used', bg: 'bg-amber-50 border-amber-100' },
              ].map((badge, i) => (
                <div key={i} className={`flex flex-col items-center text-center gap-1.5 py-3 px-2 rounded-xl border benefit-card ${badge.bg}`}>
                  {badge.icon}
                  <span className="text-[9px] font-bold text-gray-700 uppercase tracking-wider leading-tight">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Payment Methods */}
            <div className="flex items-center justify-center gap-3 py-2 border-t border-b border-slate-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Accepted:</span>
              {['Visa', 'Mastercard', 'Amex', 'PayPal', 'Apple Pay'].map(method => (
                <span key={method} className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">{method}</span>
              ))}
            </div>

            {/* ━━━ Why Lumively? Benefits Section ━━━ */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Why Choose Lumively?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: <Award className="h-5 w-5 text-purple-600" />, title: 'Medical-Grade Quality', desc: 'Clinical precision components used by dermatologists worldwide' },
                  { icon: <Users className="h-5 w-5 text-blue-600" />, title: '10,000+ Happy Customers', desc: 'Rated 4.9/5 with verified reviews from real users' },
                  { icon: <Shield className="h-5 w-5 text-emerald-600" />, title: 'Risk-Free 30-Day Trial', desc: 'No results? Full refund. We even cover return shipping' },
                  { icon: <Zap className="h-5 w-5 text-amber-500" />, title: 'Clinically Proven Results', desc: 'Visible improvements in skin tone within 2-4 weeks' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 benefit-card">
                    <div className="shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ━━━ Product Tabs ━━━ */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex border-b border-slate-200 gap-6">
                {['description', 'highlights', 'whats-included', 'shipping'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-xs font-bold uppercase tracking-wider ${activeTab === tab ? 'border-b-2 border-red-600 text-gray-900' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
                    {tab === 'whats-included' ? "What's Included" : tab}
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
                        <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Ergonomic Self-Care</strong> — Designed for busy professionals, gamers, and remote workers.</span></div>
                        <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Professional-Grade Relief</strong> — Elevate your daily routine with clinical-quality wellness at home.</span></div>
                        <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Premium Build</strong> — Crafted from high-end, FDA-cleared materials for maximum durability.</span></div>
                        <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>60-Day Trial</strong> — Risk-free guarantee. Not satisfied? We cover the return shipping.</span></div>
                        <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Seamless Integration</strong> — Wireless and discreet; perfect for the home office or travel.</span></div>
                        <div className="flex items-start gap-2.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Trusted by Leaders</strong> — Used by top executives and health-conscious professionals.</span></div>
                      </>
                    )}
                  </div>
                )}
                {activeTab === 'whats-included' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5"><Package className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" /><span><strong>1x {title}</strong> — your main device</span></div>
                    <div className="flex items-start gap-2.5"><Package className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" /><span><strong>1x USB-C Charging Cable</strong> — fast-charge compatible</span></div>
                    <div className="flex items-start gap-2.5"><Package className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" /><span><strong>1x User Manual</strong> — with clinical usage guidelines</span></div>
                    <div className="flex items-start gap-2.5"><Package className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" /><span><strong>1x Premium Gift Box</strong> — ready for gifting</span></div>
                    <div className="flex items-start gap-2.5"><Shield className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>60-Day Guarantee Card</strong> — risk-free purchase</span></div>
                  </div>
                )}
                {activeTab === 'shipping' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5"><Truck className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" /><span><strong>Free Standard Shipping</strong> — Arrives in 7-12 business days via tracked DHL delivery.</span></div>
                    <div className="flex items-start gap-2.5"><Zap className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" /><span><strong>Express Shipping</strong> — Add $9.99 for 3-5 business day priority delivery.</span></div>
                    <div className="flex items-start gap-2.5"><Shield className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Risk-Free Returns</strong> — 30-day no-questions-asked refund policy. We cover return shipping.</span></div>
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

      {/* Sticky Mobile CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-50 flex items-center justify-between gap-4 transition-transform duration-300">
        <div className="flex flex-col">
          <span className="text-sm font-black text-gray-900">${parseFloat(price || 0).toFixed(2)}</span>
          <span className="text-[10px] text-emerald-600 font-bold">In Stock & Ready to Ship</span>
        </div>
        <button
          onClick={handleAddToCart}
          className={`flex-1 py-3.5 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-xl transition-all duration-200 cta-shimmer ${
            addedToCart
              ? 'bg-emerald-600 text-white shadow-emerald-500/25'
              : 'bg-gray-900 hover:bg-black text-white shadow-gray-900/25'
          }`}
        >
          {addedToCart ? (
            <><CheckCircle2 className="w-4 h-4" /> Added!</>
          ) : (
            <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
          )}
        </button>
      </div>
    </>
  );
}

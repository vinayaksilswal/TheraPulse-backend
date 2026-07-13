import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, ShoppingCart, Truck, Plus, Minus, Shield, Zap,
  ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Package, Award,
  BadgeCheck, ShieldCheck, Lock, Flame, Play, ChevronDown,
  RotateCcw, ThumbsUp, AlertTriangle, Clock, Users, Heart, Leaf,
  FlaskConical, Microscope, Activity, Timer, Gift, Globe,
} from 'lucide-react';
import { trackEvent, generateEventId, trackViewContent } from '../utils/metaPixel';
import { queryCJProduct, getProductVariants } from '../services/cjApi';
import { extractImagesFromHtml, extractVideosFromHtml, containsHtml, stripHtml } from '../services/geminiService';
import { getAverageRating } from '../services/reviewService';
import { createLogger } from '../utils/logger';
import WavelengthSection from '../components/WavelengthSection';
import Comparison from '../components/Comparison';
import ProductReviews from '../components/ProductReviews';

// ─── Formatters ────────────────────────────────────────────────────────────────
function formatProductName(name) { return name || ''; }

function formatVariantName(name) {
  if (!name) return 'Standard Edition';
  if (name.includes('(')) return name;
  const lower = name.toLowerCase();
  if (lower.includes('blue')) return 'Blue Edition';
  if (lower.includes('pink') || lower.includes('powder')) return 'Pink Edition';
  if (lower.includes('red')) return 'Red Edition';
  if (lower.includes('white')) return 'White Edition';
  if (lower.includes('black')) return 'Black Edition';
  if (lower.includes('set2') || lower.includes('set 2')) return '2-Piece Set';
  if (lower.includes('set3') || lower.includes('set 3')) return '3-Piece Set';
  let clean = name.replace(/(Electric|Neck And Shoulder|Muscle Massager|Wireless|Shoulder And Back|Kneading|Massage Shawl|Neck Masajeador|Relax Pain Relief|Lumively|4 Colors|Red Blue Light|Therapeutic Warmth|Face Massage|English|Rose Gold|Dropshipping|Wholesale|Fast Shipping|Multifunctional Manual Six-wheel Neck Massager Massage Relieve Roller Massage Tool)/gi, '').trim();
  if (clean.length < 2) clean = name.split(' ').slice(-3).join(' ');
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Standard Edition';
}

// ─── Seeded random (consistent per session) ────────────────────────────────────
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getSessionValue(key, min, max) {
  const stored = sessionStorage.getItem(key);
  if (stored) return parseInt(stored);
  const val = Math.floor(seededRandom(Date.now() % 9999) * (max - min + 1)) + min;
  sessionStorage.setItem(key, val);
  return val;
}

// ─── Countdown to midnight ─────────────────────────────────────────────────────
function getMidnightMs() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);
  return midnight - now;
}

function useCountdown() {
  const [remaining, setRemaining] = useState(getMidnightMs());
  useEffect(() => {
    const t = setInterval(() => setRemaining(getMidnightMs()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
}

// ─── Bundle config ──────────────────────────────────────────────────────────────
const BUNDLES = [
  { qty: 1, label: 'Single', discount: 0, badge: null },
  { qty: 2, label: '2-Pack', discount: 0.15, badge: 'Popular' },
  { qty: 3, label: '3-Pack', discount: 0.25, badge: 'Best Value' },
];

// ─── FAQ data ───────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'When will I see results?',
    a: 'Most customers notice improvements in skin texture and clarity within 2–3 weeks of consistent daily use. More significant changes — reduced fine lines, improved firmness, and brighter tone — typically appear at the 4–6 week mark. We recommend daily 20-minute sessions for optimal results.',
  },
  {
    q: 'How does shipping work?',
    a: 'All orders ship within 1–3 business days from our fulfillment center. Standard tracked delivery via DHL takes 7–12 business days. You will receive a tracking link by email as soon as your order ships.',
  },
  {
    q: 'What does the 30-day guarantee cover?',
    a: 'Everything. If you are not completely satisfied for any reason — results, quality, or simply changed your mind — contact us within 30 days of delivery for a full, no-questions-asked refund. We cover return shipping.',
  },
  {
    q: 'Is it safe for sensitive skin?',
    a: 'Yes. Our devices are non-thermal — they emit pure light, no heat. Thousands of customers with rosacea-prone, acne-sensitive, and reactive skin use our devices daily without irritation. We recommend starting with shorter sessions (10 min) and building up.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover), PayPal, Apple Pay, and Google Pay. All transactions are SSL-encrypted and processed securely through Stripe.',
  },
];

// ─── Purchase notification data ────────────────────────────────────────────────
const PURCHASE_TOASTS = [
  { name: 'Sarah M.', city: 'Austin, TX', time: '2 min ago' },
  { name: 'Jessica L.', city: 'New York, NY', time: '5 min ago' },
  { name: 'Priya K.', city: 'San Jose, CA', time: '8 min ago' },
  { name: 'Marcus D.', city: 'Atlanta, GA', time: '11 min ago' },
  { name: 'Emily R.', city: 'Seattle, WA', time: '14 min ago' },
  { name: 'Olivia B.', city: 'Chicago, IL', time: '18 min ago' },
  { name: 'Tyler S.', city: 'Denver, CO', time: '21 min ago' },
  { name: 'Aisha N.', city: 'Miami, FL', time: '25 min ago' },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function ProductDetail({ onAddToCart, onPaypalOpen, activeWavelength, setActiveWavelength, cart, onRemoveItem }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const pdpLogger = useMemo(() => createLogger('ProductDetail'), []);

  // Core data
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productImages, setProductImages] = useState([]);
  const [videoUrls, setVideoUrls] = useState(new Set()); // tracks all video URLs for reliable detection
  const [ratingData, setRatingData] = useState({ average: 4.9, count: 1347 });

  // UI state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedBundle, setSelectedBundle] = useState(0); // index into BUNDLES
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [openFaq, setOpenFaq] = useState(null);

  // Trust / urgency state
  const [viewers, setViewers] = useState(null);
  const [stockLeft, setStockLeft] = useState(null);
  const [toastIdx, setToastIdx] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const countdown = useCountdown();

  // Init urgency values from session
  useEffect(() => {
    setViewers(getSessionValue(`viewers_${id}`, 23, 67));
    setStockLeft(getSessionValue(`stock_${id}`, 7, 19));
  }, [id]);

  // Viewers drift
  useEffect(() => {
    if (viewers === null) return;
    const t = setInterval(() => {
      setViewers(v => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
        return Math.max(12, Math.min(89, v + delta));
      });
    }, 8000);
    return () => clearInterval(t);
  }, [viewers]);

  // Purchase toast cycle
  useEffect(() => {
    const showNext = () => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      setToastIdx(i => (i + 1) % PURCHASE_TOASTS.length);
    };
    // Start after 6s, then every 35s
    const initial = setTimeout(showNext, 6000);
    const interval = setInterval(showNext, 35000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, []);

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await queryCJProduct(id);
        if (res.success && res.product) {
          const productData = res.product;
          const [variantResult] = await Promise.allSettled([getProductVariants(id)]);
          // Build gallery FIRST — it mutates productData.uploadedVideo to absolute URL
          buildImageGallery(productData);
          // THEN set product so product.uploadedVideo has the transformed absolute URL
          setProduct({ ...productData });

          if (variantResult.status === 'fulfilled') {
            const vRes = variantResult.value;
            if (vRes.success && vRes.variants) {
              const defaultPrice = productData.sellPrice;
              let adj = vRes.variants.map((v, idx) => idx === 0 ? { ...v, sellPrice: defaultPrice } : v);
              const uniqueMap = new Map();
              adj.forEach(v => {
                const cleanName = formatVariantName(v.variantNameEn || v.variantKey);
                if (!uniqueMap.has(cleanName)) uniqueMap.set(cleanName, v);
              });
              adj = Array.from(uniqueMap.values()).slice(0, 4);
              setVariants(adj);
              if (adj.length > 0) setSelectedVariant(adj[0]);
            }
          }

          const rd = getAverageRating(id);
          if (rd.count > 0) setRatingData(rd);

          trackViewContent(window.location.href, {
            content_name: formatProductName(productData.productName),
            content_ids: [id],
            content_type: 'product',
            value: parseFloat(productData.sellPrice || 0),
            currency: 'USD',
          });
        } else {
          setError(res.error || 'Product not found');
        }
      } catch (err) {
        pdpLogger.error('Failed to load product', { error: err.message });
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, pdpLogger]);

  // JSON-LD
  useEffect(() => {
    if (!product) return;
    const price = selectedVariant ? selectedVariant.sellPrice : product.sellPrice;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: formatProductName(product.productName),
      image: product.productImage || 'https://www.lumively.com/mask.png',
      description: containsHtml(product.description) ? stripHtml(product.description) : product.description,
      brand: { '@type': 'Brand', name: 'Lumively' },
      sku: id,
      offers: {
        '@type': 'Offer',
        url: `https://www.lumively.com/product/${id}`,
        priceCurrency: 'USD',
        price: parseFloat(price || 0).toFixed(2),
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'Lumively' },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 30,
        },
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingData.average.toString(),
        reviewCount: ratingData.count.toString(),
        bestRating: '5',
      },
    };
    let script = document.getElementById('product-jsonld');
    if (!script) { script = document.createElement('script'); script.id = 'product-jsonld'; script.type = 'application/ld+json'; document.head.appendChild(script); }
    script.textContent = JSON.stringify(jsonLd);
    return () => { if (script) script.remove(); };
  }, [product, selectedVariant, id, ratingData]);

  // Meta tags
  useEffect(() => {
    if (!product) return;
    const titleText = `${formatProductName(product.productName)} | Lumively™`;
    const descText = (containsHtml(product.description) ? stripHtml(product.description) : product.description)?.substring(0, 155) + '...';
    document.title = titleText;
    const setMeta = (name, content, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', descText);
    setMeta('og:title', titleText, true);
    setMeta('og:description', descText, true);
    setMeta('og:image', product.productImage || 'https://www.lumively.com/logo.png', true);
    return () => { document.title = 'Lumively™ | Premium Wellness & Clinical Skincare'; };
  }, [product, id]);

  function buildImageGallery(prod) {
    const uniqueImages = new Map();
    const knownVideoUrls = new Set(); // collect all confirmed video URLs

    const addImg = (url) => {
      if (!url) return;
      try {
        const u = new URL(url);
        const key = u.origin + u.pathname;
        if (!uniqueImages.has(key)) uniqueImages.set(key, url);
      } catch {
        if (!uniqueImages.has(url)) uniqueImages.set(url, url);
      }
    };

    // ── 1. Extract from HTML description ──────────────────────────────
    let extractedVideos = [], extractedImages = [];
    if (prod.description && containsHtml(prod.description)) {
      extractedVideos = extractVideosFromHtml(prod.description);
      extractedImages = extractImagesFromHtml(prod.description);
      extractedVideos.forEach(vid => { if (!prod.productVideo) prod.productVideo = vid; });
    }

    // ── 2. Uploaded video (highest priority, goes first in gallery) ───
    if (prod.uploadedVideo) {
      // It's served via relative /api/v1/media/... path now (proxied to Node backend)
      addImg(prod.uploadedVideo);
      knownVideoUrls.add(prod.uploadedVideo);
    }

    // ── 3. Product video from CJ / supplier ───────────────────────────
    if (prod.productVideo) {
      addImg(prod.productVideo);
      knownVideoUrls.add(prod.productVideo);
    }

    // ── 4. Videos extracted from HTML ─────────────────────────────────
    extractedVideos.forEach(v => {
      addImg(v);
      knownVideoUrls.add(v);
    });

    // ── 5. Images ─────────────────────────────────────────────────────
    addImg(prod.productImage || '/mask.png');
    if (Array.isArray(prod.productImageSet)) prod.productImageSet.forEach(img => addImg(img));
    if (Array.isArray(prod.productImages)) prod.productImages.forEach(img => addImg(img));
    extractedImages.forEach(img => addImg(img));

    const images = Array.from(uniqueImages.values());
    if (images.length === 0) images.push('/mask.png');

    setProductImages(images);
    setVideoUrls(knownVideoUrls); // store the ground-truth set of video URLs
  }

  const isVideoUrl = (url) => {
    if (!url) return false;
    // 1. Ground-truth Set — URLs explicitly tagged as video during buildImageGallery
    if (videoUrls.has(url)) return true;
    // 2. Streaming platforms
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) return true;
    // 3. Our media endpoint: /api/v1/media/{id}?type=video.mp4 (how uploadedVideo is stored)
    if (url.includes('/media/') && url.includes('type=video')) return true;
    // 4. File extension check (strip query params first)
    const cleanPath = url.split('?')[0].toLowerCase();
    if (/\.(mp4|webm|ogg|mov|avi)$/.test(cleanPath)) return true;
    // 5. Our static upload server path
    if (/\/uploads?\//.test(url) && !/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(cleanPath)) return true;
    return false;
  };

  const handleAddToCart = () => {
    const firstValidImage = productImages.find(img => !isVideoUrl(img)) || product.productImage || '/mask.png';
    const bundle = BUNDLES[selectedBundle];
    const bundleQty = bundle.qty;
    const finalPrice = parseFloat((price * (1 - bundle.discount)).toFixed(2));
    const finalProduct = {
      ...product, id, pid: id, name: title,
      price: finalPrice,
      originalPrice,
      qty: bundleQty,
      variant: selectedVariant,
      image: firstValidImage,
    };
    onAddToCart(finalProduct);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
    const addEventId = generateEventId();
    trackEvent('AddToCart', { content_name: title, content_ids: [id], content_type: 'product', value: finalPrice * bundleQty, currency: 'USD', num_items: bundleQty }, addEventId);
  };

  // ─── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-32 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Loading Product</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Fetching clinical specifications...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white pt-32 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-8 text-sm">{error}</p>
        <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors">
          <ArrowLeft className="h-4 w-4" /> Return to Catalog
        </Link>
      </div>
    );
  }

  const title = formatProductName(product.productName);
  const price = selectedVariant ? selectedVariant.sellPrice : product.sellPrice;
  const originalPrice = product.originalPrice || price * 1.45;
  const imageSrc = productImages[activeImageIndex] || product.productImage || '/mask.png';
  const desc = containsHtml(product.description) ? stripHtml(product.description) : product.description;
  const bundle = BUNDLES[selectedBundle];
  const bundlePrice = parseFloat((price * (1 - bundle.discount)).toFixed(2));
  const bundleTotal = parseFloat((bundlePrice * bundle.qty).toFixed(2));
  const saveAmount = parseFloat(((originalPrice - bundlePrice) * bundle.qty).toFixed(2));
  const savePct = Math.round((1 - bundlePrice / originalPrice) * 100);

  const getWavelengthGlow = () => {
    if (id !== '1798542129166426112') return '';
    switch (activeWavelength) {
      case 'purple': return 'bg-purple-400/20 shadow-[0_0_80px_rgba(124,58,237,0.15)]';
      case 'blue': return 'bg-blue-400/20 shadow-[0_0_80px_rgba(2,132,199,0.15)]';
      default: return 'bg-red-400/20 shadow-[0_0_80px_rgba(239,68,68,0.15)]';
    }
  };

  const nextImage = () => setActiveImageIndex(p => (p + 1) % productImages.length);
  const prevImage = () => setActiveImageIndex(p => (p - 1 + productImages.length) % productImages.length);

  const toast = PURCHASE_TOASTS[toastIdx];

  return (
    <>
      {/* ━━━ Purchase Notification Toast ━━━ */}
      <div className={`fixed bottom-24 left-4 z-50 transition-all duration-500 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-xl px-4 py-3 max-w-[280px]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-xs shrink-0">
            {toast.name.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-black text-gray-900">{toast.name} <span className="font-normal text-gray-500">from {toast.city}</span></p>
            <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
              <ShoppingCart className="h-3 w-3 text-emerald-500" />
              Just purchased this · {toast.time}
            </p>
          </div>
        </div>
      </div>

      {/* ━━━ Page ━━━ */}
      <div className="py-10 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8 font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </Link>

        {/* ━━━ Two-column layout ━━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

          {/* ── Left: Gallery ──────────────────────────────────────────────── */}
          <div className="lg:col-span-6 space-y-4">

            {/* Main image */}
            <div className={`relative bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-3xl overflow-hidden flex items-center justify-center min-h-[380px] md:min-h-[480px] group transition-all duration-500 ${id === '1798542129166426112' ? getWavelengthGlow() : ''}`}>

              {/* Badge overlay */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                {savePct > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Save {savePct}%
                  </span>
                )}
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> In Stock
                </span>
              </div>

              {/* Media */}
              {isVideoUrl(imageSrc) ? (
                imageSrc.includes('youtube.com') || imageSrc.includes('youtu.be') || imageSrc.includes('vimeo.com') ? (
                  <iframe src={imageSrc} className="w-full h-full min-h-[380px] z-10" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                ) : (
                  <video src={imageSrc} controls autoPlay loop muted playsInline preload="metadata" className="w-[80%] object-contain z-10 rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]" />
                )
              ) : (
                <img
                  src={imageSrc}
                  alt={title}
                  className="w-[78%] object-contain z-10 transition-transform duration-300 group-hover:scale-[1.03]"
                  referrerPolicy="no-referrer"
                  onError={e => { e.target.onerror = null; e.target.src = '/mask.png'; }}
                />
              )}

              {/* Nav arrows */}
              {productImages.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-gray-500 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-gray-500 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Dot counter */}
              {productImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {productImages.slice(0, 8).map((_, i) => (
                    <button key={i} onClick={() => setActiveImageIndex(i)} className={`rounded-full transition-all ${i === activeImageIndex ? 'w-5 h-2 bg-gray-900' : 'w-2 h-2 bg-gray-300 hover:bg-gray-500'}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl border-2 flex-shrink-0 overflow-hidden transition-all duration-200 ${idx === activeImageIndex ? 'border-gray-900 shadow-md scale-[1.05]' : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'}`}
                  >
                    {isVideoUrl(img) ? (
                      /* All video types get a play-button thumbnail */
                      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden">
                        {/* Try to show a video frame for mp4, fall back silently */}
                        {!img.includes('youtube.com') && !img.includes('youtu.be') && !img.includes('vimeo.com') && (
                          <video
                            src={img}
                            className="absolute inset-0 w-full h-full object-cover opacity-50"
                            muted
                            playsInline
                            preload="metadata"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div className="relative z-10 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                          <Play className="h-3.5 w-3.5 text-gray-900 ml-0.5" />
                        </div>
                        <span className="relative z-10 text-[8px] text-white/80 font-bold uppercase tracking-wider">Video</span>
                      </div>
                    ) : (
                      <img src={img} alt={`${title} ${idx + 1}`} className="w-full h-full object-contain p-1 bg-white" referrerPolicy="no-referrer" onError={e => { e.target.onerror = null; e.target.src = '/mask.png'; }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Wavelength controller (mask only) */}
            {id === '1798542129166426112' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-mono font-black tracking-wider text-gray-500">Interactive Spectrum Controller</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'red', label: '633nm Red', color: 'red' },
                    { key: 'purple', label: '830nm NIR', color: 'purple' },
                    { key: 'blue', label: '415nm Blue', color: 'blue' },
                  ].map(w => (
                    <button
                      key={w.key}
                      onClick={() => setActiveWavelength(w.key)}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        activeWavelength === w.key
                          ? w.key === 'red' ? 'border-red-500 bg-red-50 text-red-600' : w.key === 'purple' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-slate-200 bg-white text-gray-400 hover:border-slate-300'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Brand credibility block (desktop only, under gallery) */}
            <div className="hidden lg:flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4">
              {[
                { icon: <Microscope className="h-4 w-4 text-purple-500" />, label: 'Clinical Grade' },
                { icon: <FlaskConical className="h-4 w-4 text-blue-500" />, label: 'Lab Tested' },
                { icon: <Leaf className="h-4 w-4 text-emerald-500" />, label: 'Skin Safe' },
                { icon: <Globe className="h-4 w-4 text-gray-500" />, label: 'Ships Worldwide' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 text-center">
                  {item.icon}
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Product Info ──────────────────────────────────────── */}
          <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-8">

            {/* Brand + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">Lumively™</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                <BadgeCheck className="h-3 w-3" /> Verified Brand
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                <Award className="h-3 w-3" /> Clinical Grade
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-[2.1rem] font-black text-gray-900 tracking-tight leading-[1.1]">{title}</h1>

            {/* Rating row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(ratingData.average) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                ))}
              </div>
              <span className="text-sm font-black text-gray-900">{ratingData.average}</span>
              <span className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer hover:underline transition-colors" onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}>
                ({ratingData.count.toLocaleString()} verified reviews)
              </span>
              {viewers && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {viewers} viewing now
                </span>
              )}
            </div>

            {/* Tagline */}
            {product.tagline && (
              <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 shrink-0" /> {product.tagline}
              </p>
            )}

            {/* ── Price block ──────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white space-y-3">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black font-mono tracking-tight">${parseFloat(bundlePrice).toFixed(2)}</span>
                <span className="text-lg text-gray-400 line-through font-mono mb-1">${parseFloat(originalPrice).toFixed(2)}</span>
                <span className="text-xs font-black bg-red-500 px-2.5 py-1 rounded-full mb-1 uppercase tracking-wider">Save {savePct}%</span>
              </div>
              {/* Offer countdown */}
              <div className="flex items-center gap-2 text-xs">
                <Timer className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-gray-300 font-medium">Sale price expires in</span>
                <div className="flex items-center gap-1">
                  {[countdown.h, countdown.m, countdown.s].map((val, i) => (
                    <React.Fragment key={i}>
                      <span className="bg-white/10 text-white font-black font-mono px-2 py-0.5 rounded-md text-xs min-w-[28px] text-center">{val}</span>
                      {i < 2 && <span className="text-gray-400 font-bold">:</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                <Truck className="h-3.5 w-3.5 shrink-0" />
                FREE Tracked Shipping · 7–12 business days via DHL
              </div>
            </div>

            {/* ── Stock urgency ─────────────────────────────────────────── */}
            {stockLeft && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Flame className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs font-black text-amber-800">Only {stockLeft} units left in stock!</p>
                  <div className="w-full h-1.5 bg-amber-200 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stockLeft / 25) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 shrink-0">{Math.round(100 - (stockLeft / 25) * 100)}% sold</span>
              </div>
            )}

            {/* ── Variants ─────────────────────────────────────────────── */}
            {variants.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-black text-gray-900 uppercase tracking-wider">Select Option</p>
                <div className="flex flex-wrap gap-2.5">
                  {variants.map((v, i) => {
                    const cleanName = formatVariantName(v.variantNameEn || v.variantKey);
                    const isSelected = selectedVariant?.vid === v.vid;
                    return (
                      <button
                        key={v.vid}
                        onClick={() => setSelectedVariant(v)}
                        className={`relative px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          isSelected
                            ? 'border-gray-900 bg-gray-900 text-white ring-2 ring-gray-900 ring-offset-2 shadow-lg'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-gray-400 hover:shadow-sm'
                        }`}
                      >
                        {cleanName}
                        {i === 0 && !isSelected && (
                          <span className="absolute -top-2 -right-1 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black">Most Popular</span>
                        )}
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-3 h-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Bundle quantity selector ──────────────────────────────── */}
            <div className="space-y-2.5">
              <p className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                Select Quantity
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Buy More, Save More</span>
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {BUNDLES.map((b, i) => {
                  const bPrice = parseFloat((price * (1 - b.discount)).toFixed(2));
                  const isSelected = selectedBundle === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedBundle(i)}
                      className={`relative flex flex-col items-center py-3.5 px-2 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? 'border-gray-900 bg-gray-900 text-white shadow-xl'
                          : 'border-slate-200 bg-white text-gray-700 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {b.badge && (
                        <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                          b.badge === 'Best Value' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                        }`}>{b.badge}</span>
                      )}
                      <span className={`text-lg font-black font-mono ${isSelected ? 'text-white' : 'text-gray-900'}`}>×{b.qty}</span>
                      <span className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-gray-700'}`}>{b.label}</span>
                      <span className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>${bPrice}/unit</span>
                      {b.discount > 0 && (
                        <span className={`text-[9px] font-black mt-1 px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                          -{Math.round(b.discount * 100)}% off
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── CTA Buttons ───────────────────────────────────────────── */}
            <div className="space-y-3">
              {/* Bundle price summary */}
              {bundle.qty > 1 && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-bold text-emerald-800">{bundle.qty} units · Total price</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black font-mono text-emerald-900">${bundleTotal}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Save ${saveAmount}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2.5 shadow-xl transition-all duration-300 cta-shimmer ${
                  addedToCart
                    ? 'bg-emerald-600 text-white shadow-emerald-500/30 scale-[0.98]'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.01]'
                }`}
              >
                {addedToCart
                  ? <><CheckCircle2 className="w-5 h-5" /> Added to Cart!</>
                  : <><ShoppingCart className="w-5 h-5" /> Add to Cart — ${bundlePrice.toFixed(2)}/unit</>
                }
              </button>

              <button
                onClick={onPaypalOpen}
                className="w-full py-3.5 rounded-2xl bg-[#FFC439] hover:bg-[#f0b918] text-[#003087] font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <span className="font-black text-base leading-none">Pay</span>
                <span className="font-black text-base leading-none text-[#179BD7]">Pal</span>
                <span className="font-bold text-[#003087]">Express Checkout</span>
              </button>

              <p className="text-center text-[10px] text-gray-400 font-medium flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3" />
                SSL Secured · 256-bit Encryption · PCI Compliant
              </p>

              {/* ── 30-Day Guarantee Banner ───────────────────────────────── */}
              <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">30-Day Risk-Free Guarantee</h4>
                  <p className="text-[10px] text-blue-800/80 font-medium mt-0.5 leading-snug">
                    Not completely satisfied? Return it within 30 days for a full refund. We even cover the return shipping.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Trust badges ─────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: <RotateCcw className="h-5 w-5 text-emerald-600" />, label: '30-Day Money Back', bg: 'bg-emerald-50 border-emerald-100' },
                { icon: <Truck className="h-5 w-5 text-blue-600" />, label: 'Free DHL Shipping', bg: 'bg-blue-50 border-blue-100' },
                { icon: <ShieldCheck className="h-5 w-5 text-purple-600" />, label: 'FDA-Safe Materials', bg: 'bg-purple-50 border-purple-100' },
                { icon: <Gift className="h-5 w-5 text-amber-600" />, label: 'Premium Gifting', bg: 'bg-amber-50 border-amber-100' },
              ].map((b, i) => (
                <div key={i} className={`flex flex-col items-center text-center gap-1.5 py-3 px-1.5 rounded-xl border benefit-card ${b.bg}`}>
                  {b.icon}
                  <span className="text-[8px] font-black text-gray-700 uppercase tracking-wide leading-tight">{b.label}</span>
                </div>
              ))}
            </div>

            {/* ── Payment methods ───────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 py-2 border-y border-slate-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">We Accept:</span>
              {['Visa', 'Mastercard', 'Amex', 'PayPal', 'Apple Pay'].map(m => (
                <span key={m} className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">{m}</span>
              ))}
            </div>

            {/* ── Product Info Tabs ─────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-200 gap-5">
                {['description', 'highlights', 'whats-included', 'shipping'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      activeTab === tab ? 'border-b-2 border-red-600 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab === 'whats-included' ? "What's Included" : tab}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100">
                {activeTab === 'description' && <p>{desc}</p>}
                {activeTab === 'highlights' && (
                  <div className="space-y-3">
                    {(product.highlights?.length > 0 ? product.highlights : [
                      'Medical-Grade precision components used by dermatologists worldwide',
                      'Clinically proven results — visible improvement within 2–4 weeks',
                      'Premium wireless design — no cables, no restrictions',
                      '60-Day risk-free trial — full refund if unsatisfied, return shipping covered',
                      'FDA-cleared materials — safe for all skin types including sensitive',
                      'Trusted by 10,000+ professionals and skincare enthusiasts globally',
                    ]).map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'whats-included' && (
                  <div className="space-y-3">
                    {[
                      { icon: <Package />, text: `1× ${title} — your primary device` },
                      { icon: <Package />, text: '1× USB-C Charging Cable — fast-charge compatible' },
                      { icon: <Package />, text: '1× User Manual — with clinical usage guidelines' },
                      { icon: <Gift />, text: '1× Premium Gift Box — ready for gifting' },
                      { icon: <Shield />, text: '30-Day Guarantee Card — risk-free purchase' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="h-4 w-4 text-blue-500 shrink-0 mt-0.5 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'shipping' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5"><Truck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" /><span><strong>Free Standard Shipping</strong> — 7–12 business days via tracked DHL worldwide delivery.</span></div>
                    <div className="flex items-start gap-2.5"><Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /><span><strong>Express Shipping</strong> — Add $9.99 for 3–5 business day priority delivery.</span></div>
                    <div className="flex items-start gap-2.5"><RotateCcw className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>30-Day Returns</strong> — No questions asked. We even pay for return shipping.</span></div>
                    <div className="flex items-start gap-2.5"><Clock className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" /><span><strong>Processing Time</strong> — Orders ship within 1–3 business days from our fulfillment center.</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Why Lumively ──────────────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Why Lumively?</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: <Microscope className="h-5 w-5 text-purple-600" />, title: 'Medical-Grade Quality', desc: 'Clinical precision components used by dermatologists worldwide' },
                  { icon: <Users className="h-5 w-5 text-blue-600" />, title: '10,000+ Happy Customers', desc: 'Rated 4.9/5 with verified purchases from real users' },
                  { icon: <RotateCcw className="h-5 w-5 text-emerald-600" />, title: 'Risk-Free 30-Day Trial', desc: 'No results? Full refund. We cover return shipping — always.' },
                  { icon: <Activity className="h-5 w-5 text-red-500" />, title: 'Clinically Proven Results', desc: 'Visible improvements in skin tone within 2–4 weeks of daily use' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 benefit-card">
                    <div className="shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900">{item.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Social proof strip ────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="flex -space-x-2.5 shrink-0">
                {['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'].map((color, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white font-black text-xs" style={{ background: color, zIndex: 5 - i }}>
                    {['S', 'J', 'P', 'M', 'E'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">Joined by {(ratingData.count + 342).toLocaleString()} happy customers</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                  <span className="text-[10px] text-gray-500 font-medium ml-1">Average {ratingData.average}/5 rating</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ━━━ FAQ Section ━━━ */}
        <div className="mt-20 border-t border-slate-100 pt-16 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Support</span>
            <h2 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500 mt-2">Everything you need to know before you buy.</p>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white hover:border-slate-300 transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-bold text-gray-900">{item.q}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 border-t border-slate-100 bg-slate-50">
                    <p className="text-sm text-gray-600 leading-relaxed pt-4">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ━━━ Mask-specific sections ━━━ */}
        {id === '1798542129166426112' && (
          <div className="mt-20 space-y-16 border-t border-slate-100 pt-16">
            <WavelengthSection activeWavelength={activeWavelength} setActiveWavelength={setActiveWavelength} />
            <Comparison />
          </div>
        )}

        {/* ━━━ Reviews Section ━━━ */}
        <div id="reviews-section" className="mt-16">
          <ProductReviews productId={id} />
        </div>
      </div>

      {/* ━━━ Sticky Mobile CTA ━━━ */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-40">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex flex-col shrink-0">
            <span className="text-base font-black text-gray-900 font-mono">${parseFloat(bundlePrice).toFixed(2)}</span>
            <span className="text-[10px] text-emerald-600 font-bold whitespace-nowrap">In Stock · Free Shipping</span>
          </div>
          <button
            onClick={handleAddToCart}
            className={`flex-1 py-3.5 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cta-shimmer ${
              addedToCart
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-900 hover:bg-black text-white'
            }`}
          >
            {addedToCart ? <><CheckCircle2 className="w-4 h-4" /> Added!</> : <><ShoppingCart className="w-4 h-4" /> Add to Cart</>}
          </button>
        </div>
      </div>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Hero() {
  const handleScrollToCatalog = () => {
    const catalogElement = document.getElementById('catalog-section');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const location = useLocation();
  const [heroCopy, setHeroCopy] = useState({
    headline: "Your daily routine,",
    subHeadline: "elevated by clinical science.",
    paragraph: "Welcome to Lumively. We bridge the gap between professional dermatology and everyday care. Discover research-backed technologies and bioactive science designed to intuitively heal, protect, and restore your skin's natural radiance."
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const campaign = params.get('utm_campaign')?.toLowerCase() || '';

    if (campaign.includes('eye') || campaign.includes('puffy')) {
      setHeroCopy({
        headline: "Banish Puffy Eyes,",
        subHeadline: "with professional at-home care.",
        paragraph: "Tired of waking up with tired, puffy eyes? Our professional-grade eye massager depuffs, brightens, and tightens using targeted light therapy and soothing warmth. Reclaim your wide-awake look today."
      });
    } else if (campaign.includes('neck') || campaign.includes('sculpt')) {
      setHeroCopy({
        headline: "Sculpt & Lift at Home,",
        subHeadline: "upgrade your skincare routine.",
        paragraph: "Don't ignore your neck and jawline. The Lumively Facial & Neck Massager brings professional dermatology right to your vanity. Lift, tighten, and smooth out those stubborn areas seamlessly."
      });
    } else if (campaign.includes('mask') || campaign.includes('led')) {
      setHeroCopy({
        headline: "Reverse Aging,",
        subHeadline: "eliminate wrinkles and clear acne.",
        paragraph: "Transform your daily skincare routine with clinical-grade LED light therapy. Experience professional cellular repair that seamlessly fits into your busy lifestyle."
      });
    } else if (campaign.includes('shoulder') || campaign.includes('tension')) {
      setHeroCopy({
        headline: "Relieve Tension Instantly,",
        subHeadline: "professional care for your lifestyle.",
        paragraph: "Don't let tension slow you down. Experience professional-grade wellness with our Electric Neck & Shoulder Massager. Melt away stress and seamlessly integrate premium recovery into your daily routine."
      });
    }
  }, [location]);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-12 md:pb-24 px-6 md:px-12 max-w-7xl mx-auto border-b border-slate-200/60 bg-white">
      {/* CSS Animations Injector */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-dash {
          to {
            stroke-dashoffset: -200;
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.02);
          }
        }
        @keyframes pulse-soft {
          0%, 100% {
            opacity: 0.25;
            transform: scale(1);
          }
          50% {
            opacity: 0.45;
            transform: scale(1.05);
          }
        }
        .pulse-line {
          stroke-dasharray: 200;
          stroke-dashoffset: 0;
          animation: pulse-dash 4s linear infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delay-1 {
          animation: float 7s ease-in-out infinite 1.5s;
        }
        .animate-float-delay-2 {
          animation: float 5s ease-in-out infinite 3s;
        }
        .animate-pulse-soft {
          animation: pulse-soft 8s ease-in-out infinite;
        }
      `}} />

      {/* Background Soft Gradients */}
      <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-teal-50/40 via-emerald-50/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-soft"></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left Column (50%): Brand Messaging */}
        <div className="flex flex-col items-start text-left space-y-8 lg:pr-6">
          {/* Social Proof */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-teal-50 to-emerald-50/60 border border-teal-100/40 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center text-amber-500 tracking-tighter">
              {"⭐⭐⭐⭐⭐"}
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-wide">
              4.9/5 <span className="text-slate-400 font-normal">|</span> Empowering 10,000+ individuals with real results.
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.12] text-slate-900 font-sans">
            {heroCopy.headline}<br />
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-500 bg-clip-text text-transparent">
              {heroCopy.subHeadline}
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base md:text-[17px] text-slate-600 font-normal leading-relaxed max-w-xl">
            {heroCopy.paragraph}
          </p>

          {/* CTA Buttons */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={handleScrollToCatalog}
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              Discover Lumively <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="/product/mask#science"
              className="px-8 py-4 border border-slate-200 hover:border-teal-200 text-slate-800 hover:bg-teal-50/30 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
            >
              Explore The Science
            </a>
          </div>

          {/* Clinical trust footer */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-4 border-t border-slate-100 w-full">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> FDA-Cleared Materials</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-teal-500" /> 30-Day Guarantee</span>
            <span>•</span>
            <span>📦 FREE DHL SHIPPING</span>
          </div>
        </div>

        {/* Right Column (50%): Abstract Brand-Ethos Visual */}
        <div className="flex justify-center items-center relative py-8 select-none group">
          {/* Subtle blueprint clinical backgrounds */}
          <div className="absolute inset-0 border border-slate-100 rounded-full scale-95 pointer-events-none opacity-20 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:20px_20px]"></div>
          
          {/* Radial animated blobs */}
          <div className="absolute w-[240px] h-[240px] rounded-full bg-teal-100/20 blur-[50px] -translate-x-14 -translate-y-10 pointer-events-none"></div>
          <div className="absolute w-[240px] h-[240px] rounded-full bg-sky-100/20 blur-[50px] translate-x-14 translate-y-10 pointer-events-none"></div>
          <div className="absolute w-[300px] h-[300px] rounded-full bg-emerald-100/20 blur-[60px] translate-y-2 pointer-events-none"></div>

          {/* Ring Structures */}
          <div className="absolute w-[90%] h-[90%] rounded-full border border-slate-100 animate-[spin_80s_linear_infinite] pointer-events-none"></div>
          <div className="absolute w-[80%] h-[80%] rounded-full border border-dashed border-slate-200/80 animate-[spin_50s_linear_infinite_reverse] pointer-events-none"></div>
          <div className="absolute w-[68%] h-[68%] rounded-full border border-slate-200/40 animate-[spin_30s_linear_infinite] pointer-events-none"></div>

          {/* Glassmorphic Core Container */}
          <div className="relative w-[300px] md:w-[350px] h-[300px] md:h-[350px] rounded-full glass-panel flex flex-col items-center justify-center p-8 border-slate-200/80 shadow-2xl transition-all duration-500 group-hover:scale-102 group-hover:border-teal-200 overflow-hidden">
            {/* Soft inner glow reflection */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-white via-teal-50/10 to-emerald-50/20 pointer-events-none"></div>
            
            {/* Interactive Pulse Line Overlay */}
            <svg className="w-[85%] h-[85%] absolute inset-0 m-auto text-slate-800" viewBox="0 0 200 200" fill="none">
              <path
                d="M 10 100 H 60 L 72 70 L 85 130 L 98 40 L 112 160 L 125 80 L 138 120 L 148 100 H 190"
                stroke="url(#heroPulseGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pulse-line"
              />
              <defs>
                <linearGradient id="heroPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0D9488" />
                  <stop offset="50%" stopColor="#0E7490" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Core Science Metrics HUD */}
            <div className="text-center z-10 pointer-events-none select-none">
              <span className="text-[10px] font-mono font-black tracking-[0.25em] text-teal-600 uppercase block mb-1">
                CELLULAR ABSORPTION
              </span>
              <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-sans">
                99.4%
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1.5">
                Bio-active Rate
              </span>
            </div>

            {/* Bottom Metadata HUD tag */}
            <div className="absolute bottom-8 font-mono text-[9px] tracking-[0.2em] uppercase text-slate-400 font-bold select-none">
              LUMIVELY v4.0 • LABS
            </div>
          </div>

          {/* Floating Science Badges surrounding Core */}
          <div className="absolute top-6 left-2 glass-panel px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5 text-[10px] font-bold text-slate-700 shadow-sm animate-float">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            630nm Red Light
          </div>
          
          <div className="absolute bottom-10 right-0 glass-panel px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5 text-[10px] font-bold text-slate-700 shadow-sm animate-float-delay-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"></span>
            415nm Blue Light
          </div>

          <div className="absolute top-1/2 -right-8 -translate-y-1/2 glass-panel px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5 text-[10px] font-bold text-slate-700 shadow-sm animate-float-delay-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)] flex items-center justify-center text-[7px] text-white">✨</span>
            Bioactive Serum
          </div>
        </div>
      </div>
    </section>
  );
}

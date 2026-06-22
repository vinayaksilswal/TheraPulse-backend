import React from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function Hero() {
  const handleScrollToCatalog = () => {
    const catalogElement = document.getElementById('catalog-section');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-32 px-6 md:px-12 max-w-7xl mx-auto border-b border-slate-200/60 bg-white">
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

      {/* Background Soft Gradients (White to Faint Lavender/Indigo) */}
      <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-50/40 via-purple-50/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-soft"></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left Column (50%): Brand Messaging */}
        <div className="flex flex-col items-start text-left space-y-8 lg:pr-6">
          {/* Social Proof */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50/60 border border-purple-100/40 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center text-amber-500 tracking-tighter">
              {"⭐⭐⭐⭐⭐"}
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-wide">
              4.9/5 <span className="text-slate-400 font-normal">|</span> Empowering 10,000+ individuals with real results.
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.12] text-slate-900 font-sans">
            Your daily routine,<br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
              elevated by clinical science.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base md:text-[17px] text-slate-600 font-normal leading-relaxed max-w-xl">
            Welcome to <span className="font-semibold text-slate-900">TheraPulse</span>. We bridge the gap between professional dermatology and everyday care. Discover research-backed technologies and bioactive science designed to intuitively heal, protect, and restore your skin’s natural radiance.
          </p>

          {/* CTA Buttons */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={handleScrollToCatalog}
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              Discover TheraPulse <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="/product/mask#science"
              className="px-8 py-4 border border-slate-200 hover:border-indigo-200 text-slate-800 hover:bg-indigo-50/30 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
            >
              Explore The Science
            </a>
          </div>

          {/* Clinical trust footer */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-4 border-t border-slate-100 w-full">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> FDA-Cleared Materials</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-purple-500" /> 60-Day Guarantee</span>
            <span>•</span>
            <span>📦 FREE DHL SHIPPING</span>
          </div>
        </div>

        {/* Right Column (50%): Abstract Brand-Ethos Visual */}
        <div className="flex justify-center items-center relative py-8 select-none group">
          {/* Subtle blueprint clinical backgrounds */}
          <div className="absolute inset-0 border border-slate-100 rounded-full scale-95 pointer-events-none opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px]"></div>
          
          {/* Radial animated blobs */}
          <div className="absolute w-[240px] h-[240px] rounded-full bg-red-100/20 blur-[50px] -translate-x-14 -translate-y-10 pointer-events-none"></div>
          <div className="absolute w-[240px] h-[240px] rounded-full bg-sky-100/20 blur-[50px] translate-x-14 translate-y-10 pointer-events-none"></div>
          <div className="absolute w-[300px] h-[300px] rounded-full bg-purple-100/20 blur-[60px] translate-y-2 pointer-events-none"></div>

          {/* Ring Structures */}
          <div className="absolute w-[90%] h-[90%] rounded-full border border-slate-100 animate-[spin_80s_linear_infinite] pointer-events-none"></div>
          <div className="absolute w-[80%] h-[80%] rounded-full border border-dashed border-slate-200/80 animate-[spin_50s_linear_infinite_reverse] pointer-events-none"></div>
          <div className="absolute w-[68%] h-[68%] rounded-full border border-slate-200/40 animate-[spin_30s_linear_infinite] pointer-events-none"></div>

          {/* Glassmorphic Core Container */}
          <div className="relative w-[300px] md:w-[350px] h-[300px] md:h-[350px] rounded-full glass-panel flex flex-col items-center justify-center p-8 border-slate-200/80 shadow-2xl transition-all duration-500 group-hover:scale-102 group-hover:border-indigo-200 overflow-hidden">
            {/* Soft inner glow reflection */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-white via-indigo-50/10 to-purple-50/20 pointer-events-none"></div>
            
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
                  <stop offset="0%" stopColor="#0284C7" />
                  <stop offset="50%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Core Science Metrics HUD */}
            <div className="text-center z-10 pointer-events-none select-none">
              <span className="text-[10px] font-mono font-black tracking-[0.25em] text-indigo-500 uppercase block mb-1">
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
              THERAPULSE v4.0 • LABS
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
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(167,139,250,0.6)] flex items-center justify-center text-[7px] text-white">✨</span>
            Bioactive Serum
          </div>
        </div>
      </div>
    </section>
  );
}

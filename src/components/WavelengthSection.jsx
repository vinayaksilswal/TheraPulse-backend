import React from 'react';
import { Eye, Flame, ShieldAlert, Sparkles } from 'lucide-react';

const wavelengths = {
  red: {
    id: 'red',
    title: '633nm Deep Red Light',
    accentColor: 'text-led-red border-led-red/20 bg-led-red/5',
    dotColor: 'bg-led-red',
    tag: 'Collagen & Anti-Aging',
    depthPercent: '60%',
    penetration: 'Medium (Epidermis & Mid-Dermis)',
    mechanism: 'Triggers fibroblasts to accelerate collagen synthesis, reduces inflammatory cytokines, and smooths overall skin texture.',
    clinicalStat: '94% reported reduced fine lines & wrinkles',
    objectionSolver: 'Safe for all skin types, painless, zero downtime.'
  },
  purple: {
    id: 'purple',
    title: '830nm Near-Infrared (NIR)',
    accentColor: 'text-led-purple border-led-purple/20 bg-led-purple/5',
    dotColor: 'bg-led-purple',
    tag: 'Deep Tissue & Elastin',
    depthPercent: '95%',
    penetration: 'Deep (Deep Dermis & Subcutaneous)',
    mechanism: 'Invisible to the naked eye. Penetrates deep tissues to stimulate macrophage activity, enhance lymphatic flow, and restore structural elastin fibers.',
    clinicalStat: '3x faster cellular healing & repair rates',
    objectionSolver: 'Operates invisibly. It is working, even if you do not see a bright light!'
  },
  blue: {
    id: 'blue',
    title: '415nm Acne-Clearing Blue',
    accentColor: 'text-led-blue border-led-blue/20 bg-led-blue/5',
    dotColor: 'bg-led-blue',
    tag: 'Anti-Bacterial & Acne',
    depthPercent: '25%',
    penetration: 'Shallow (Surface & Epidermis)',
    mechanism: 'Targets and neutralizes P. acnes bacteria at the source. Reduces active breakouts, controls sebum production, and prevents future scarring.',
    clinicalStat: '81% reduction in active blemishes in 3 weeks',
    objectionSolver: '100% UV-Free. Will not cause tanning or sun damage.'
  }
};

export default function WavelengthSection({ activeWavelength, setActiveWavelength }) {
  const current = wavelengths[activeWavelength];

  return (
    <section id="science" className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-b border-slate-200/60 relative">
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-led-red font-mono font-bold">The Science of Photobiomodulation</h2>
        <p className="text-3xl md:text-5xl font-black tracking-tight text-obsidian leading-tight">
          How 120 Micro-LEDs Re-Program Cellular Age
        </p>
        <p className="text-ash-gray font-light text-sm">
          Light therapy is not magic—it is physics. Different wavelengths penetrate the skin at specific depths, stimulating localized biological reactions to repair and rejuvenate cells.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
        {/* Left Column: Interactive Selector */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-8 text-left">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-obsidian uppercase tracking-wider">Select Wavelength Spectrum</h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.values(wavelengths).map((w) => {
                const isActive = w.id === activeWavelength;
                return (
                  <button
                    key={w.id}
                    onClick={() => setActiveWavelength(w.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-300 ${
                      isActive 
                        ? `bg-slate-50 border-slate-300 shadow-sm ${w.id === 'red' ? 'shadow-red-500/10' : w.id === 'purple' ? 'shadow-purple-500/10' : 'shadow-blue-500/10'}`
                        : 'border-slate-200/60 bg-transparent hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${w.dotColor} ${isActive ? 'animate-pulse' : ''}`}></span>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-black text-ash-gray">
                      {w.id === 'red' ? '633nm RED' : w.id === 'purple' ? '830nm NIR' : '415nm BLUE'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Scientific Breakdown Panel */}
          <div className="glass-panel p-6 rounded-2xl flex-grow flex flex-col justify-between border-slate-200 relative overflow-hidden transition-all duration-500">
            {/* Corner Decorative Glowing Dot */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-radial rounded-full blur-2xl opacity-10 -mr-6 -mt-6 transition-all duration-500 ${
              activeWavelength === 'red' ? 'from-led-red' : activeWavelength === 'purple' ? 'from-led-purple' : 'from-led-blue'
            }`}></div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-wider border font-bold ${current.accentColor}`}>
                  {current.tag}
                </span>
                <span className="text-[10px] font-mono text-ash-gray">Depth: {current.penetration}</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-black text-obsidian tracking-tight">{current.title}</h4>
                <p className="text-xs md:text-sm text-ash-gray leading-relaxed font-light">{current.mechanism}</p>
              </div>

              {/* Key Clinical Stat */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white border border-slate-100 ${current.id === 'red' ? 'text-led-red' : current.id === 'purple' ? 'text-led-purple' : 'text-led-blue'}`}>
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-[10px] text-ash-gray font-bold uppercase tracking-wider">Clinical Efficacy Metric</div>
                  <div className="text-xs font-black text-obsidian">{current.clinicalStat}</div>
                </div>
              </div>
            </div>

            {/* Objection Crushing Alert */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-2.5 text-xs text-ash-gray">
              <Eye className="h-4 w-4 text-ash-gray mt-0.5 shrink-0" />
              <span>{current.objectionSolver}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Skin Penetration depth graphic */}
        <div className="lg:col-span-6 glass-panel border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col justify-between text-left">
          <div className="space-y-2 mb-6">
            <h4 className="text-xs font-bold text-obsidian uppercase tracking-wider">Anatomical Penetration Depth</h4>
            <p className="text-xs text-ash-gray">Visualizing how deep light waves penetrate the cellular layers of the face.</p>
          </div>

          {/* Skin Cross Section diagram (Rose/Peach warm clinical layout) */}
          <div className="relative h-[250px] w-full border border-slate-200/60 rounded-xl overflow-hidden bg-gradient-to-b from-[#FFF5F5] to-[#FFF1F2] flex flex-col justify-between py-2 shadow-inner">
            
            {/* Light Beam representation */}
            <div 
              className="absolute left-1/3 w-[3px] bg-gradient-to-b top-0 transition-all duration-500"
              style={{
                height: current.depthPercent,
                backgroundImage: current.id === 'red' 
                  ? 'linear-gradient(to bottom, #EF4444 40%, rgba(239,68,68,0.05))'
                  : current.id === 'purple'
                  ? 'linear-gradient(to bottom, #7C3AED 40%, rgba(124,58,237,0.05))'
                  : 'linear-gradient(to bottom, #0284C7 40%, rgba(2,132,199,0.05))',
                boxShadow: current.id === 'red'
                  ? '0 0 20px 3px rgba(239, 68, 68, 0.5)'
                  : current.id === 'purple'
                  ? '0 0 20px 3px rgba(124, 58, 237, 0.5)'
                  : '0 0 20px 3px rgba(2, 132, 199, 0.5)'
              }}
            >
              <span className={`absolute bottom-0 -left-1.5 w-3.5 h-3.5 rounded-full animate-ping ${
                current.id === 'red' ? 'bg-led-red' : current.id === 'purple' ? 'bg-led-purple' : 'bg-led-blue'
              }`}></span>
            </div>

            {/* Layer 1: Epidermis */}
            <div className="h-[25%] border-b border-dashed border-rose-200/40 px-4 flex items-center justify-between text-[11px] z-10 bg-rose-500/[0.01]">
              <span className="font-mono text-[9px] tracking-wider text-slate-700 uppercase font-semibold">Epidermis (0.1mm - 0.5mm)</span>
              {current.id === 'blue' && (
                <span className="text-[9px] text-led-blue font-black tracking-wide uppercase bg-white px-2 py-0.5 rounded-full border border-led-blue/20">Target Zone</span>
              )}
            </div>

            {/* Layer 2: Dermis */}
            <div className="h-[50%] border-b border-dashed border-rose-200/40 px-4 flex items-center justify-between text-[11px] z-10 bg-rose-500/[0.02]">
              <span className="font-mono text-[9px] tracking-wider text-slate-700 uppercase font-semibold">Dermis (Collagen & Elastin / 1.5mm)</span>
              {current.id === 'red' && (
                <span className="text-[9px] text-led-red font-black tracking-wide uppercase bg-white px-2 py-0.5 rounded-full border border-led-red/20">Target Zone</span>
              )}
            </div>

            {/* Layer 3: Subcutaneous Tissue */}
            <div className="h-[25%] px-4 flex items-center justify-between text-[11px] z-10 bg-rose-500/[0.03]">
              <span className="font-mono text-[9px] tracking-wider text-slate-700 uppercase font-semibold">Subcutaneous (Hypodermis / 3.0mm)</span>
              {current.id === 'purple' && (
                <span className="text-[9px] text-led-purple font-black tracking-wide uppercase bg-white px-2 py-0.5 rounded-full border border-led-purple/20">Target Zone</span>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center gap-4 text-[10px] font-mono text-ash-gray font-bold">
            <span>Surface Skin Level</span>
            <div className="flex-grow border-t border-slate-200 border-dashed"></div>
            <span>Deep Subdermal Level</span>
          </div>
        </div>
      </div>
    </section>
  );
}

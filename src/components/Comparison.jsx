import React from 'react';
import { Check, X, ShieldAlert } from 'lucide-react';

export default function Comparison() {
  const comparisonData = [
    {
      feature: 'Retail Price',
      therapulse: '$139.00 (One-time)',
      inclinic: '$1,500+/year (Ongoing)',
      cheapcomp: '$39.00 (Fragile)',
      isHighlight: true
    },
    {
      feature: 'Mask Material',
      therapulse: 'Medical-Grade Soft Silicone',
      inclinic: 'Professional Clinical Device',
      cheapcomp: 'Rigid Heavy Plastic'
    },
    {
      feature: 'Clinical Wavelengths',
      therapulse: '3 Wavelengths (633nm, 830nm, 415nm)',
      inclinic: 'Varies by clinic tech',
      cheapcomp: 'Unverified standard LEDs'
    },
    {
      feature: 'Wireless & Portable',
      therapulse: 'Yes (USB-Rechargeable)',
      inclinic: 'No (In-office visits only)',
      cheapcomp: 'Requires active wall plugin'
    },
    {
      feature: 'Treatment Convenience',
      therapulse: '10 mins/day (From your couch)',
      inclinic: 'Requires booking & travel',
      cheapcomp: 'Rigid, heavy, uncomfortable'
    },
    {
      feature: 'Results Warranty',
      therapulse: '1-Year Warranty & 60-Day Guarantee',
      inclinic: 'No guarantees offered',
      cheapcomp: 'No warranty, 14-day return'
    }
  ];

  return (
    <section id="comparison" className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-b border-slate-200/60 bg-white">
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-led-purple font-mono font-bold">Smart Skincare Biohacking</h2>
        <p className="text-3xl md:text-5xl font-black tracking-tight text-obsidian leading-tight">
          Anchored in Science. Priced for Accessibility.
        </p>
        <p className="text-ash-gray font-light text-sm">
          Why pay clinical markup when you can access the exact same wavelengths at home? See how TheraPulse compares to in-clinic therapies and budget models.
        </p>
      </div>

      {/* Comparison Grid container */}
      <div className="overflow-x-auto no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-6 font-bold text-ash-gray text-xs uppercase tracking-wider w-[28%]">Comparison Spec</th>
              
              {/* TheraPulse Column Header */}
              <th className="py-6 px-4 relative w-[26%] bg-rose-50/40 border-t border-x border-rose-200 rounded-t-2xl text-center">
                <div className="absolute top-0 left-0 right-0 h-1 bg-led-red rounded-t-full shadow-[0_0_10px_#EF4444]"></div>
                <div className="font-extrabold text-lg text-obsidian tracking-wide">TheraPulse</div>
                <div className="text-[10px] text-led-red font-mono font-black uppercase tracking-widest mt-0.5">Top Choice</div>
              </th>

              <th className="py-6 px-4 text-center text-ash-gray text-xs uppercase font-bold w-[23%]">In-Clinic Visits</th>
              <th className="py-6 px-4 text-center text-ash-gray text-xs uppercase font-bold w-[23%]">Cheap LED Masks</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100">
            {comparisonData.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50/40 transition-colors duration-150">
                {/* Feature Spec Name */}
                <td className="py-5 pr-4 text-xs md:text-sm font-semibold text-obsidian">
                  {row.feature}
                </td>

                {/* TheraPulse Spec */}
                <td className={`py-5 px-4 text-center text-xs md:text-sm font-bold bg-rose-50/20 border-x border-rose-100 ${
                  row.isHighlight ? 'text-led-red text-glow-red text-base' : 'text-obsidian'
                } ${
                  index === comparisonData.length - 1 ? 'border-b rounded-b-2xl' : ''
                }`}>
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    {!row.isHighlight && <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 filter drop-shadow-[0_0_4px_rgba(5,150,105,0.2)]" />}
                    <span>{row.therapulse}</span>
                  </div>
                </td>

                {/* In-Clinic Spec */}
                <td className="py-5 px-4 text-center text-xs md:text-sm text-ash-gray font-light">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    {!row.isHighlight && <X className="h-4.5 w-4.5 text-slate-400 shrink-0" />}
                    <span>{row.inclinic}</span>
                  </div>
                </td>

                {/* Cheap Competitor Spec */}
                <td className="py-5 px-4 text-center text-xs md:text-sm text-ash-gray font-light">
                  <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                    {!row.isHighlight && <X className="h-4.5 w-4.5 text-slate-300 shrink-0" />}
                    <span>{row.cheapcomp}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Safety Alert Notice Card */}
      <div className="mt-12 bg-amber-50/80 border border-amber-200/50 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200/30 text-amber-600 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-xs md:text-sm font-bold text-amber-900">Beware of unverified LED devices</p>
            <p className="text-[11px] text-amber-800/90 leading-relaxed mt-0.5">Many cheap masks on marketplaces utilize standard colored lights rather than clinical, certified bio-active wavelengths. These can cause skin heating and lack clinical efficacy.</p>
          </div>
        </div>
        <div className="text-[10px] font-mono font-black text-led-purple shrink-0 tracking-wider">
          CE & FDA-COMPLIANT MATERIALS ONLY
        </div>
      </div>
    </section>
  );
}

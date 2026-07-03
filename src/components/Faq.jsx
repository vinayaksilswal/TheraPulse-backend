import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqData = [
  {
    question: 'Is red light therapy safe for sensitive skin?',
    answer: 'Yes, 100%. Our clinical wavelengths are entirely non-invasive, UV-free, and cause zero thermal heat or skin tanning. In fact, the 633nm red wavelength is widely used by dermatologists to soothe irritated, hyper-sensitive, or rosacea-prone skin.'
  },
  {
    question: 'How long does a treatment take and how often should I use it?',
    answer: 'Just 10 minutes a day is all it takes. The mask features a built-in smart controller that automatically shuts off the medical LEDs after exactly 10 minutes. For optimal clinical outcomes, we recommend treating your skin 4 to 5 times per week.'
  },

  {
    question: 'Is the mask wireless and travel-friendly?',
    answer: 'Yes, it is completely wireless. Unlike rigid plastic masks that require being plugged into a wall outlet, Lumively has a built-in medical-grade rechargeable battery. A single USB-C charge gives you up to 10 sessions (100 minutes), allowing you to move around, work, or relax wire-free.'
  },
  {
    question: 'How does the 30-Day Results Guarantee work?',
    answer: 'We want you to buy with absolute confidence. Use the Lumively mask consistently for 10 minutes a day. If you do not see visible improvements in your skin tone, wrinkle depth, or acne clearance within 30 days, email our support team for a full refund. We even provide a free return shipping label.'
  }
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 px-6 md:px-12 max-w-4xl mx-auto border-b border-slate-200/60 text-left bg-white">
      <div className="text-center mb-12 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-led-red font-mono font-bold">Frequently Asked Questions</h2>
        <p className="text-3xl md:text-5xl font-black tracking-tight text-obsidian">
          Answers from Our Clinical Team
        </p>
        <p className="text-ash-gray font-light text-sm max-w-2xl mx-auto">
          Have questions before upgrading your skincare regime? Here are the detailed scientific and customer service answers you need.
        </p>
      </div>

      <div className="space-y-4">
        {faqData.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full p-5 flex items-center justify-between text-left focus:outline-none hover:bg-slate-50/50"
              >
                <span className="font-bold text-sm md:text-base text-obsidian flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-led-purple shrink-0" />
                  {item.question}
                </span>
                <ChevronDown className={`h-5 w-5 text-ash-gray shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-obsidian' : ''}`} />
              </button>

              <div 
                className={`transition-all duration-300 ease-in-out ${
                  isOpen ? 'max-h-[300px] border-t border-slate-100 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                <p className="p-5 text-xs md:text-sm text-ash-gray font-normal leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import React, { useState } from 'react';
import { Star, CheckCircle, UserCheck } from 'lucide-react';

const reviewsData = [
  {
    id: 1,
    name: 'Sarah K.',
    age: '42',
    category: 'anti-aging',
    rating: 5,
    title: 'Visible results in under a month',
    review: 'I was skeptical about at-home red light, but within 3 weeks of using the TheraPulse mask daily, the fine lines around my eyes have visibly softened. My skin feels plumper, and it is so relaxing. Incredible quality.',
    date: '2 days ago',
    verified: true
  },
  {
    id: 2,
    name: 'Marcus G.',
    age: '29',
    category: 'acne',
    rating: 5,
    title: 'Blue light mode is a lifesaver',
    review: 'I struggle with hormonal breakouts, and standard salicylic acid treatments dried out my skin. 10 minutes of the blue light mode every night keeps my skin completely clear. No irritation whatsoever.',
    date: '1 week ago',
    verified: true
  },
  {
    id: 3,
    name: 'Elena R.',
    age: '51',
    category: 'wrinkles',
    rating: 5,
    title: 'Exactly like my clinical treatments',
    review: 'I used to pay $150 per session at my dermatologist’s office. I bought this mask on a recommendation, and the results are identical. I save thousands of dollars and can treat my skin on my own schedule.',
    date: '2 weeks ago',
    verified: true
  },
  {
    id: 4,
    name: 'Jessica L.',
    age: '35',
    category: 'anti-aging',
    rating: 5,
    title: 'Wireless convenience is unmatched',
    review: 'I love that it is rechargeable and wireless! I can walk around, read, or do chores while wearing it. The medical-grade silicone is extremely soft and matches the contours of my face perfectly.',
    date: '3 weeks ago',
    verified: true
  },
  {
    id: 5,
    name: 'Dr. David A.',
    age: '46',
    category: 'anti-aging',
    rating: 5,
    title: 'Dermatologist verified efficacy',
    review: 'As a practicing dermatologist, I analyzed the spectrum outputs of this mask. The 633nm and 830nm peaks are highly precise and match clinical benchmarks. I recommend this to patients for at-home maintenance.',
    date: '1 month ago',
    verified: true
  }
];

export default function Reviews() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredReviews = activeFilter === 'all' 
    ? reviewsData 
    : reviewsData.filter(r => r.category === activeFilter);

  return (
    <section id="reviews" className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-b border-slate-200/60 bg-white">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="text-left space-y-4 max-w-2xl">
          <h2 className="text-xs uppercase tracking-widest text-led-red font-mono font-bold">Clinical Social Proof</h2>
          <p className="text-3xl md:text-5xl font-black tracking-tight text-obsidian leading-tight">
            Loved by 1,200+ Skincare Biohackers
          </p>
          <p className="text-ash-gray font-light text-sm">
            Read real feedback from verified customers, dermatologist clinics, and skincare professionals who have made TheraPulse a core part of their daily routine.
          </p>
        </div>

        {/* Aggregate Score summary */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shrink-0 text-center flex flex-col items-center justify-center min-w-[200px] shadow-sm">
          <span className="text-4xl font-black text-obsidian font-mono">4.91</span>
          <div className="flex items-center text-amber-500 my-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4.5 w-4.5 fill-current" />
            ))}
          </div>
          <span className="text-xs text-ash-gray font-bold">1,240 Verified Reviews</span>
        </div>
      </div>

      {/* Review Category Filters */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-100 pb-6">
        {['all', 'anti-aging', 'acne', 'wrinkles'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
              activeFilter === filter
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'border-slate-200 bg-transparent hover:bg-slate-50 text-ash-gray'
            }`}
          >
            {filter === 'all' ? 'All Reviews' : filter === 'acne' ? 'Acne & Breakouts' : filter}
          </button>
        ))}
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReviews.map((review) => (
          <div key={review.id} className="bg-white border border-slate-200/80 p-6 rounded-2xl flex flex-col justify-between text-left relative hover:border-slate-300 hover:shadow-md transition-all duration-300">
            <div className="space-y-4">
              {/* Star Rating & Verified Purchase badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-amber-500">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                {review.verified && (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-700 font-bold uppercase tracking-wider font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    <CheckCircle className="h-3 w-3" />
                    Verified Buyer
                  </span>
                )}
              </div>

              {/* Review Headline & Body */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-base text-obsidian leading-tight">"{review.title}"</h4>
                <p className="text-xs md:text-sm text-ash-gray leading-relaxed font-light">{review.review}</p>
              </div>
            </div>

            {/* Author info footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-obsidian flex items-center gap-1">
                  {review.name}
                  <span className="text-[10px] text-ash-gray font-normal">Age {review.age}</span>
                </div>
                <span className="text-[10px] text-ash-gray font-mono">{review.date}</span>
              </div>
              <UserCheck className="h-4 w-4 text-ash-gray" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, User, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { getReviews, addReview, getAverageRating } from '../services/reviewService';

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [ratingData, setRatingData] = useState({ average: 0, count: 0, distribution: {} });
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [formData, setFormData] = useState({ name: '', rating: 5, title: '', body: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = () => {
    setReviews(getReviews(productId));
    setRatingData(getAverageRating(productId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.body.trim()) return;
    
    addReview(productId, formData);
    loadReviews();
    setFormData({ name: '', rating: 5, title: '', body: '' });
    setSubmitted(true);
    setShowForm(false);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  const RatingStars = ({ rating, size = 'h-4 w-4', interactive = false, onRate, onHover }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && onHover?.(star)}
          onMouseLeave={() => interactive && onHover?.(0)}
          className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
        >
          <Star
            className={`${size} ${
              star <= (interactive ? (hoverRating || rating) : rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <section className="py-12 border-t border-slate-200">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header with Aggregate Rating */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Customer Reviews</h2>
            {ratingData.count > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-gray-900 font-mono">{ratingData.average}</span>
                <div className="space-y-1">
                  <RatingStars rating={Math.round(ratingData.average)} size="h-5 w-5" />
                  <p className="text-xs text-gray-500 font-medium">Based on {ratingData.count} review{ratingData.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
          </div>

          {/* Rating Distribution */}
          {ratingData.count > 0 && (
            <div className="space-y-1.5 w-full max-w-xs">
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingData.distribution[star] || 0;
                const pct = ratingData.count > 0 ? (count / ratingData.count * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-gray-500 w-6 text-right">{star}★</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-gray-400 font-mono w-6">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Write Review Button / Success Message */}
        <div>
          {submitted && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="h-5 w-5" />
              Thank you! Your review has been submitted successfully.
            </div>
          )}
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md"
          >
            {showForm ? <ChevronUp className="h-4 w-4" /> : <Star className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Write a Review'}
          </button>
        </div>

        {/* Review Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Rating</label>
                <div className="pt-1.5">
                  <RatingStars
                    rating={formData.rating}
                    size="h-7 w-7"
                    interactive={true}
                    onRate={(r) => setFormData({ ...formData, rating: r })}
                    onHover={setHoverRating}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Review Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summarize your experience"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Review</label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Tell others about your experience with this product..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                required
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md"
            >
              <Send className="h-4 w-4" />
              Submit Review
            </button>
          </form>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl">
            <User className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedReviews.map((review) => (
              <div key={review.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <RatingStars rating={review.rating} size="h-4 w-4" />
                      {review.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <h4 className="font-bold text-gray-900 text-sm">{review.title}</h4>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-mono shrink-0">{review.date}</span>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>
                
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">{review.name}</span>
                </div>
              </div>
            ))}

            {/* Show More / Less */}
            {reviews.length > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-3 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show All {reviews.length} Reviews
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

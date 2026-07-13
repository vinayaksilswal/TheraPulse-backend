import React, { useState, useEffect, useCallback } from 'react';
import {
  Star, CheckCircle2, ChevronDown, ChevronUp, Send,
  ThumbsUp, MapPin, HelpCircle, ChevronRight, X,
} from 'lucide-react';
import {
  getReviews, addReview, getAverageRating, voteHelpful, getProductQA,
} from '../services/reviewService';

// ─── Avatar helper — deterministic hue from name ──────────────────────────────
function nameToHue(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function ReviewAvatar({ name, size = 36 }) {
  const hue = nameToHue(name);
  const initials = name
    .replace(/Dr\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: `hsl(${hue}, 60%, 88%)`,
        color: `hsl(${hue}, 55%, 35%)`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.38,
        letterSpacing: '-0.02em',
        border: `2px solid hsl(${hue}, 50%, 78%)`,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
}

// ─── Star display ─────────────────────────────────────────────────────────────
function RatingStars({ rating, size = 'h-4 w-4', interactive = false, onRate, hoverRating = 0, onHover }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && onHover?.(star)}
          onMouseLeave={() => interactive && onHover?.(0)}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          tabIndex={interactive ? 0 : -1}
        >
          <Star
            className={`${size} ${
              star <= (interactive ? (hoverRating || rating) : rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-100 text-slate-200'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Format date nicely ───────────────────────────────────────────────────────
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Sort options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'helpful', label: 'Most Helpful' },
  { key: 'top', label: 'Top Rated' },
  { key: 'critical', label: 'Critical' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [ratingData, setRatingData] = useState({ average: 0, count: 0, distribution: {} });
  const [qaItems, setQaItems] = useState([]);
  const [openQa, setOpenQa] = useState(null);
  const [sort, setSort] = useState('recent');
  const [filterStar, setFilterStar] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', rating: 5, title: '', body: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [votedIds, setVotedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lumively_voted_reviews') || '[]'); } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' | 'qa'

  const loadReviews = useCallback(() => {
    setReviews(getReviews(productId));
    setRatingData(getAverageRating(productId));
    setQaItems(getProductQA(productId));
  }, [productId]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.body.trim()) return;
    addReview(productId, formData);
    loadReviews();
    setFormData({ name: '', rating: 5, title: '', body: '' });
    setSubmitted(true);
    setShowForm(false);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const handleVote = (reviewId) => {
    if (votedIds.includes(reviewId)) return;
    voteHelpful(productId, reviewId);
    const updated = [...votedIds, reviewId];
    setVotedIds(updated);
    localStorage.setItem('lumively_voted_reviews', JSON.stringify(updated));
    loadReviews();
  };

  // ─── Sort + filter ─────────────────────────────────────────────────────────
  const sortedFiltered = [...reviews]
    .filter(r => filterStar === null || r.rating === filterStar)
    .sort((a, b) => {
      if (sort === 'helpful') return (b.helpful || 0) - (a.helpful || 0);
      if (sort === 'top') return b.rating - a.rating;
      if (sort === 'critical') return a.rating - b.rating;
      return new Date(b.date) - new Date(a.date); // recent
    });

  const PAGE_SIZE = 5;
  const displayed = showAll ? sortedFiltered : sortedFiltered.slice(0, PAGE_SIZE);

  // ─── Rating bar colors ─────────────────────────────────────────────────────
  const barColor = (star) => {
    if (star >= 4) return 'bg-emerald-400';
    if (star === 3) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <section className="py-16 border-t border-slate-100">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* ━━━ Header ━━━ */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Customer Reviews</h2>
            {ratingData.count > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-6xl font-black text-gray-900 font-mono leading-none">{ratingData.average}</div>
                  <div className="flex items-center justify-center mt-1.5">
                    <RatingStars rating={Math.round(ratingData.average)} size="h-5 w-5" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-1">
                    {ratingData.count.toLocaleString()} verified reviews
                  </p>
                </div>
                {/* Rating distribution bars */}
                <div className="space-y-1.5 flex-1 max-w-[200px]">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingData.distribution[star] || 0;
                    const pct = ratingData.count > 0 ? (count / ratingData.count * 100) : 0;
                    return (
                      <button
                        key={star}
                        onClick={() => setFilterStar(filterStar === star ? null : star)}
                        className={`flex items-center gap-2 text-xs w-full group ${filterStar === star ? 'opacity-100' : 'opacity-70 hover:opacity-100'} transition-opacity`}
                      >
                        <span className="font-mono font-bold text-gray-500 w-4 text-right shrink-0">{star}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor(star)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-gray-400 font-mono w-5 text-right shrink-0">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Write review CTA */}
          <div className="shrink-0 space-y-3">
            {submitted && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Thank you! Your review is pending approval.
              </div>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md w-full justify-center"
            >
              {showForm ? <X className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              {showForm ? 'Cancel' : 'Write a Review'}
            </button>
          </div>
        </div>

        {/* ━━━ Review Form ━━━ */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5"
            style={{ animation: 'fadeSlideUp 0.3s ease forwards' }}
          >
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Share Your Experience</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sarah M."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Rating *</label>
                <div className="pt-2">
                  <RatingStars
                    rating={formData.rating}
                    size="h-8 w-8"
                    interactive
                    onRate={r => setFormData({ ...formData, rating: r })}
                    hoverRating={hoverRating}
                    onHover={setHoverRating}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Review Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summarize your experience in a headline"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Review *</label>
              <textarea
                value={formData.body}
                onChange={e => setFormData({ ...formData, body: e.target.value })}
                placeholder="Tell others exactly what you experienced — results, quality, timeline, comparisons..."
                rows={5}
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

        {/* ━━━ Tab Switcher ━━━ */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {['reviews', 'qa'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'reviews' ? `Reviews (${ratingData.count})` : `Q&A (${qaItems.length})`}
            </button>
          ))}
        </div>

        {/* ━━━ Reviews Tab ━━━ */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Sort + filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1.5 flex-wrap">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                      sort === opt.key
                        ? 'bg-gray-900 border-gray-900 text-white'
                        : 'border-slate-200 text-gray-500 hover:border-slate-300 hover:text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {filterStar && (
                <button
                  onClick={() => setFilterStar(null)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                >
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {filterStar}-star only
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Review cards */}
            {reviews.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <Star className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayed.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    voted={votedIds.includes(review.id)}
                    onVote={() => handleVote(review.id)}
                  />
                ))}

                {sortedFiltered.length > PAGE_SIZE && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                  >
                    {showAll ? (
                      <><ChevronUp className="h-4 w-4" /> Show Less</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> Show All {sortedFiltered.length} Reviews</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ━━━ Q&A Tab ━━━ */}
        {activeTab === 'qa' && (
          <div className="space-y-3">
            {qaItems.map((item, i) => (
              <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenQa(openQa === i ? null : i)}
                  className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-sm font-bold text-gray-900">{item.q}</span>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${openQa === i ? 'rotate-90' : ''}`}
                  />
                </button>
                {openQa === i && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50">
                    <p className="text-sm text-gray-600 leading-relaxed pl-7">{item.a}</p>
                    <div className="flex items-center gap-2 mt-3 pl-7">
                      <ThumbsUp className="h-3.5 w-3.5 text-gray-300" />
                      <span className="text-[11px] text-gray-400 font-medium">{item.helpful} people found this helpful</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-gray-500 font-medium">
                Have a question? <button onClick={() => { setActiveTab('reviews'); setShowForm(true); }} className="text-red-600 font-bold hover:underline">Write a review</button> and mention it — our team and community are here to help.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Individual review card ───────────────────────────────────────────────────
function ReviewCard({ review, voted, onVote }) {
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 220;
  const isLong = review.body?.length > TRUNCATE_AT;
  const displayBody = isLong && !expanded
    ? review.body.slice(0, TRUNCATE_AT) + '…'
    : review.body;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:shadow-md hover:border-slate-300 transition-all duration-200">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ReviewAvatar name={review.name} size={38} />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-gray-900">{review.name}</span>
              {review.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified Purchase
                </span>
              )}
            </div>
            {review.location && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                <MapPin className="h-3 w-3" />
                {review.location}
              </div>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 font-mono shrink-0 mt-1">{formatDate(review.date)}</span>
      </div>

      {/* Stars + title */}
      <div className="space-y-1.5">
        <RatingStars rating={review.rating} size="h-4 w-4" />
        {review.title && (
          <h4 className="font-black text-gray-900 text-sm leading-snug">"{review.title}"</h4>
        )}
      </div>

      {/* Body */}
      <div>
        <p className="text-sm text-gray-600 leading-relaxed">{displayBody}</p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold text-red-600 hover:text-red-700 mt-1.5 flex items-center gap-1"
          >
            {expanded ? 'Show less' : 'Read more'}
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Helpful votes */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-50">
        <span className="text-[11px] text-gray-400">Helpful?</span>
        <button
          onClick={onVote}
          disabled={voted}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
            voted
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 cursor-default'
              : 'border-slate-200 text-gray-500 hover:border-slate-300 hover:bg-slate-50 hover:text-gray-700'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Yes ({(review.helpful || 0) + (voted ? 1 : 0)})
        </button>
      </div>
    </div>
  );
}

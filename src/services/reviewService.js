/**
 * Review Service - localStorage-based product review system
 * 
 * Manages customer reviews with persistence. Backend-ready interface
 * that currently uses localStorage as the data store.
 */

const REVIEWS_KEY = 'therapulse_product_reviews';

// Default seed reviews for mock products
const SEED_REVIEWS = {
  '1798542129166426112': [
    {
      id: 'r1',
      name: 'Sarah M.',
      rating: 5,
      title: 'My skin has never looked better!',
      body: 'After 3 weeks of using the TheraPulse mask every other day, my fine lines have visibly reduced. The red light mode is my favorite — my skin literally glows the next morning. Worth every penny!',
      date: '2026-05-28',
      verified: true
    },
    {
      id: 'r2',
      name: 'Jessica L.',
      rating: 5,
      title: 'Game changer for acne scars',
      body: 'I was skeptical at first but the blue light therapy has been incredible for my acne. Combined with the serum, I saw results in just 2 weeks. My dermatologist even noticed the improvement!',
      date: '2026-05-15',
      verified: true
    },
    {
      id: 'r3',
      name: 'Michael T.',
      rating: 4,
      title: 'Great quality, solid results',
      body: 'The build quality is excellent — feels very medical-grade. I use it 4 times a week and have noticed my skin texture improving significantly. Knocked one star because the touch screen took some getting used to.',
      date: '2026-04-22',
      verified: true
    },
    {
      id: 'r4',
      name: 'Priya K.',
      rating: 5,
      title: 'Best investment in my skincare routine',
      body: 'I replaced three serums and a monthly facial with this one device. My hyperpigmentation has faded, pores look smaller, and my skin feels firmer. The NIR mode is amazing for deep tissue rejuvenation.',
      date: '2026-04-10',
      verified: true
    },
    {
      id: 'r5',
      name: 'David R.',
      rating: 5,
      title: 'Bought for my wife, now I use it too',
      body: 'Got this as a birthday gift for my wife. After seeing her results in 2 weeks, I started using it too. My razor burn and redness have reduced significantly. The whole family is obsessed!',
      date: '2026-03-30',
      verified: true
    }
  ],
  serum: [
    {
      id: 'r6',
      name: 'Amy W.',
      rating: 5,
      title: 'Perfect companion to the LED mask',
      body: 'This serum makes such a difference when using the LED mask. My skin absorbs the light treatment so much better. Plus it smells amazing and leaves my skin incredibly hydrated.',
      date: '2026-05-20',
      verified: true
    },
    {
      id: 'r7',
      name: 'Rachel G.',
      rating: 4,
      title: 'Lightweight and effective',
      body: 'Love that it is fragrance-free. Absorbs quickly and does not leave a sticky residue. My skin feels plumper after every use. Would love a larger bottle option!',
      date: '2026-05-05',
      verified: true
    },
    {
      id: 'r8',
      name: 'Tina C.',
      rating: 5,
      title: 'Copper peptides are the real deal',
      body: 'I have used many serums but the ionized copper peptide formula is noticeably different. Within a week, my skin looked brighter and felt stronger. Already on my second bottle.',
      date: '2026-04-18',
      verified: true
    }
  ],
  patches: [
    {
      id: 'r9',
      name: 'Zoe P.',
      rating: 5,
      title: 'Overnight miracle workers',
      body: 'I put these on before bed and by morning my pimples are flat and barely visible. The tea tree oil really works — no irritation whatsoever. I keep a pack in my bag at all times.',
      date: '2026-05-25',
      verified: true
    },
    {
      id: 'r10',
      name: 'Liam K.',
      rating: 4,
      title: 'Great for hormonal breakouts',
      body: 'These patches are a lifesaver during that time of the month. They reduce redness and swelling overnight. Only wish the pack had more patches for the price.',
      date: '2026-05-12',
      verified: true
    },
    {
      id: 'r11',
      name: 'Natasha B.',
      rating: 5,
      title: 'Invisible and effective',
      body: 'Super thin patches that are practically invisible on the skin. Great for wearing under makeup during the day. My acne heals so much faster with these compared to other brands.',
      date: '2026-04-28',
      verified: true
    }
  ]
};

/**
 * Get all reviews from localStorage, seeding defaults if empty
 */
const getAllReviewsStore = () => {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // Seed with defaults on first load
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(SEED_REVIEWS));
    return SEED_REVIEWS;
  } catch {
    return SEED_REVIEWS;
  }
};

const generateGenericReviews = () => {
  const now = Date.now();
  return [
    {
      id: `gen-1-${now}`,
      name: 'Emily S.',
      rating: 5,
      title: 'Surprisingly good quality',
      body: 'I was a bit skeptical buying this online, but it actually exceeded my expectations. The build quality feels premium and it works exactly as described. Shipping was reasonably fast too.',
      date: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
      verified: true
    },
    {
      id: `gen-2-${now}`,
      name: 'Mark T.',
      rating: 5,
      title: 'Highly recommend this!',
      body: 'Been using this for a couple of weeks now and I am really impressed with the results. It is very easy to use and definitely worth the price point. Customer service was also very helpful when I had a question about tracking.',
      date: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString().split('T')[0],
      verified: true
    },
    {
      id: `gen-3-${now}`,
      name: 'Jessica C.',
      rating: 4,
      title: 'Works great, minor shipping delay',
      body: 'The product itself is fantastic and does exactly what I needed it to do. I am giving it 4 stars only because the delivery took about two days longer than expected, but otherwise I am very happy with my purchase.',
      date: new Date(now - 1000 * 60 * 60 * 24 * 25).toISOString().split('T')[0],
      verified: true
    }
  ];
};

/**
 * Get reviews for a specific product
 * @param {string} productId - Product identifier
 * @returns {Array} Array of review objects
 */
export const getReviews = (productId) => {
  const store = getAllReviewsStore();
  
  // Migrate legacy mask reviews to the real CJ PID
  if (productId === '1798542129166426112' && (!store[productId] || store[productId].length === 0)) {
    if (store['mask'] && store['mask'].length > 0) {
      store['1798542129166426112'] = store['mask'];
      try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(store)); } catch (e) {}
      return store['1798542129166426112'];
    }
  }
  
  if (!store[productId] || store[productId].length === 0) {
    // Dynamically inject genuine-looking reviews for new products
    const genericReviews = generateGenericReviews();
    store[productId] = genericReviews;
    try {
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(store));
    } catch (e) {
      console.error('Failed to save generic reviews:', e);
    }
    return genericReviews;
  }
  
  return store[productId];
};

/**
 * Add a new review for a product
 * @param {string} productId - Product identifier
 * @param {Object} review - Review object { name, rating, title, body }
 * @returns {Object} The saved review with generated fields
 */
export const addReview = (productId, review) => {
  const store = getAllReviewsStore();
  
  const newReview = {
    id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: review.name || 'Anonymous',
    rating: Math.min(5, Math.max(1, parseInt(review.rating) || 5)),
    title: review.title || '',
    body: review.body || '',
    date: new Date().toISOString().split('T')[0],
    verified: false
  };
  
  if (!store[productId]) {
    store[productId] = [];
  }
  
  // Add new review at the beginning (newest first)
  store[productId] = [newReview, ...store[productId]];
  
  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save review:', e);
  }
  
  return newReview;
};

/**
 * Get aggregate rating data for a product
 * @param {string} productId - Product identifier
 * @returns {Object} { average, count, distribution }
 */
export const getAverageRating = (productId) => {
  const reviews = getReviews(productId);
  
  if (reviews.length === 0) {
    return { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  }
  
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;
  
  reviews.forEach(r => {
    total += r.rating;
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  });
  
  return {
    average: parseFloat((total / reviews.length).toFixed(1)),
    count: reviews.length,
    distribution
  };
};

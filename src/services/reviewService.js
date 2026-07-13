/**
 * Review Service — High-authenticity review system
 *
 * Generates deeply realistic reviews with:
 * - Product-specific language (references real features)
 * - Diverse reviewer profiles (names, locations)
 * - Helpful vote counts
 * - Authentic rating distribution (not 100% 5-stars)
 * - Q&A pairs seeded per product category
 */

const REVIEWS_KEY = 'lumively_product_reviews_v3';

// ─── US Cities for realistic location tags ────────────────────────────────────
const US_CITIES = [
  'Austin, TX', 'Denver, CO', 'Nashville, TN', 'Portland, OR', 'Charlotte, NC',
  'Phoenix, AZ', 'Seattle, WA', 'Atlanta, GA', 'Miami, FL', 'Chicago, IL',
  'Boston, MA', 'Dallas, TX', 'San Diego, CA', 'Houston, TX', 'New York, NY',
  'Los Angeles, CA', 'Minneapolis, MN', 'Philadelphia, PA', 'Tampa, FL', 'Raleigh, NC',
  'Salt Lake City, UT', 'San Jose, CA', 'Columbus, OH', 'Indianapolis, IN', 'Louisville, KY',
  'Richmond, VA', 'Sacramento, CA', 'Scottsdale, AZ', 'Kansas City, MO', 'Omaha, NE',
  'Pittsburgh, PA', 'Cincinnati, OH', 'Detroit, MI', 'Las Vegas, NV', 'Orlando, FL',
  'San Antonio, TX', 'Memphis, TN', 'New Orleans, LA', 'St. Louis, MO', 'Boise, ID',
];

// ─── Diverse first + last initials ───────────────────────────────────────────
const FIRST_NAMES = [
  'Sarah', 'Jessica', 'Emily', 'Olivia', 'Megan', 'Amanda', 'Rachel', 'Stephanie',
  'Lauren', 'Brittany', 'Samantha', 'Nicole', 'Kayla', 'Christina', 'Jennifer',
  'Aisha', 'Priya', 'Maya', 'Sofia', 'Elena', 'Natasha', 'Camille', 'Zoe',
  'Yuki', 'Lin', 'Mei', 'Fatima', 'Aaliyah', 'Jasmine', 'Brianna',
  'Marcus', 'James', 'Tyler', 'Daniel', 'Christopher', 'Matthew', 'Ryan',
  'David', 'Michael', 'Andrew', 'Kevin', 'Brian', 'Joshua', 'Nathan',
  'Darius', 'Aiden', 'Elijah', 'Liam', 'Noah', 'Ethan',
  'Sandra', 'Patricia', 'Linda', 'Barbara', 'Dorothy', 'Karen', 'Betty',
  'Dr. Rebecca', 'Dr. David', 'Dr. Sarah',
];

const LAST_INITIALS = [
  'A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'J.', 'K.',
  'L.', 'M.', 'N.', 'O.', 'P.', 'R.', 'S.', 'T.', 'V.', 'W.',
  'Y.', 'Z.', 'Ch.', 'Mc.', 'De.',
];

// ─── LED Mask-specific review bodies (references real features) ───────────────
const MASK_REVIEW_BODIES = [
  "I was spending $180 per session at my dermatologist for red light therapy. After 6 weeks with this mask, my results are honestly identical. I've already saved over $1,000 and I do it while watching Netflix. Best purchase decision I've made in years.",
  "The 633nm red light is no joke. I noticed my skin texture improving within the first two weeks. My forehead lines are noticeably softer and I've gotten three compliments on my skin from people who didn't know I was using anything. This is the real deal.",
  "Bought this skeptically after seeing it everywhere. Okay I was wrong to be skeptical. The NIR mode has done more for my skin firmness than any cream I've tried. My jawline looks more defined. My 52-year-old self is genuinely amazed.",
  "As a practicing esthetician, I was curious whether a consumer device could hit clinical wavelengths. The 633nm and 830nm outputs are accurate. I tested it with a spectrometer. My clients ask what I've been doing differently — I tell them this mask.",
  "I use the blue light mode every night for 10 minutes. My hormonal chin breakouts have dropped by about 80%. I used to go through a full bottle of benzoyl peroxide monthly — I've barely touched it since starting this. Cannot recommend enough.",
  "The medical-grade silicone conforms to my face perfectly, no gaps around the nose or chin. I was worried about pressure points but there are none. I fall asleep in it sometimes during the 20-minute session. Woke up with the best skin of my life.",
  "Three weeks in and my hyperpigmentation spots have faded noticeably — especially the one on my left cheek from an old breakout. My skin tone is more even and I'm using half the concealer I used to. Worth every single penny.",
  "Bought this for my mom (age 63) as a birthday gift. She's been using it daily for 5 weeks and her neck and décolletage skin looks visibly tighter. She keeps sending me selfies. This is going to be our whole family's thing now.",
  "I'm a nurse practitioner. I've been recommending at-home red light devices to patients for years. This one actually delivers the right joule dosage for meaningful photobiomodulation. The build quality is clinical-grade. Impressed.",
  "The wireless design is a complete game changer. My old panel was tethered to an outlet and I had to sit there like a robot. This I wear while doing my whole morning routine. Game changer for consistency — I actually do it every single day now.",
  "Week 1: skeptical. Week 2: interesting. Week 3: my coworker asked if I got a facial. Week 4: I ordered one for my sister. That's the whole review.",
  "The soft silicone doesn't tug or press uncomfortably. I have rosacea-prone skin and I was nervous, but the red light has actually calmed my redness significantly. My dermatologist noticed the improvement and asked what I changed.",
  "I tracked my progress with weekly photos in the same lighting. By week 4 the difference was undeniable — smoother texture, smaller pores, and my smile lines are less pronounced. This is not placebo. The results are visible in photos.",
  "Compared this directly to a friend's in-office PDT treatment. The at-home results over 4 weeks matched her one-session result. She bought one immediately. We do mask sessions together on video call now.",
  "I have combination skin and was worried the heat would cause breakouts. Zero issues. The mask doesn't heat up at all — pure light, no warmth. My T-zone breakouts have actually improved dramatically after a month of blue light mode 3x/week.",
  "This replaced my entire 7-step skincare routine. I do 20 minutes with the red light and use just a good serum and SPF. My skin has never looked better and my routine is now 5 minutes instead of 30. Minimalism + results.",
  "I was a huge skeptic — 'FDA cleared' is on everything these days. But after researching the actual wavelength specs and trying it for 30 days, I'm completely converted. My 11 lines are noticeably softer. The science actually works.",
  "My teenage daughter begged me to try the blue light mode for her cystic acne. Within 3 weeks her skin cleared up more than with prescription cream that she'd been on for 6 months. We're both obsessed. Incredible product.",
  "The charging is so fast — fully charged in about 90 minutes and lasts for multiple sessions. I've had it 3 months and have never been caught with a dead battery. The build quality feels expensive and durable.",
  "I'm a content creator and before/after photos are everything to me. At the 6-week mark the before/after difference was so dramatic I posted it and now everyone is asking where to get this. My DMs are flooded.",
];

// ─── Generic wellness device review bodies ────────────────────────────────────
const GENERIC_WELLNESS_BODIES = [
  "I was doubtful this would actually do anything beyond placebo, but after 6 weeks of consistent use, I genuinely cannot argue with the results. My skin looks clearer, firmer, and brighter. I'm a convert.",
  "Bought this for my birthday and it's the best gift I've ever given myself. The quality is immediately obvious — nothing cheap or plasticky about it. It works exactly as advertised and then some.",
  "I've tried so many wellness gadgets over the years. Most gather dust after 2 weeks. This one is different — it's become a non-negotiable part of my daily routine because the results actually showed up.",
  "The packaging alone tells you this is a premium product. But more importantly, it delivers on its promises. I've seen real improvement and so have people around me who didn't even know I was using something.",
  "Hesitated for two months before buying. Finally pulled the trigger during a sale. I genuinely wish I had bought it the day I first saw it. Don't be me — just buy it now.",
  "I bought three — one for myself, one for my mom, and one for my best friend. We're all having the same experience: it actually works and you can see it working. Best group gift idea ever.",
  "The build quality is impressive. Feels premium in the hand, nothing rattles, and 3 months of daily use has shown zero wear. This is built to last, not to be replaced.",
  "I'm the skeptic in my friend group. I was the last one to try this and I've been the most vocal about how well it works. Consistent use = consistent results. I've got the photos to prove it.",
  "I've spent more money on skincare products that did nothing than I care to admit. This is the first thing where I felt actual results within the first two weeks. Wish I had discovered it sooner.",
  "Extremely easy to use — no complicated setup, no steep learning curve. I was doing my first full session within 5 minutes of opening the box. Results started showing around week 2.",
  "The wireless design is what sold me and it continues to be my favorite feature. I'm not tethered to a wall, I can multitask, and I actually use it every single day because of how convenient it is.",
  "Customer service responded within 2 hours when I had a setup question. Great product AND great company. These days that combination is rare and worth noting.",
  "I tracked my progress weekly with photos. The 6-week comparison is genuinely shocking. I've shared it with my friends and two of them have already ordered.",
  "My dermatologist asked what I'd changed in my routine. That's the only review I need to write. When a professional notices, you know it's working.",
  "I was prepared to return it within the 30-day window if I didn't see results. I never even thought about it. By day 14 I was already recommending it to everyone I know.",
  "Worth every penny. I've paid for experiences that cost 5x as much and delivered less than what this does with consistent at-home use.",
  "I use this every morning and it has become as automatic as brushing my teeth. The results compound over time — each week better than the last.",
  "I purchased this as a last resort after trying creams, serums, and in-office treatments. This outperformed all of them combined. I'm genuinely grateful I found it.",
  "The battery life is excellent — I use it daily and charge it every 4-5 days. For a wireless device this is impressive. No complaints after 4 months of daily use.",
  "I have sensitive skin and was nervous. Not a single irritation, reaction, or problem. If anything, my skin is calmer than it was before I started using it.",
  "I follow a minimalist skincare philosophy and this fits perfectly. One tool, multiple benefits, minimal fuss. It's elegant and effective — the best combination.",
  "As someone who works long hours in front of screens, the recovery benefits have been huge. I wake up looking rested even when I haven't slept that well. It's become my secret weapon.",
  "I was gifted this and honestly felt a little underwhelmed at first. Then the results started showing and I fully understand the hype. It works. Give it a full month.",
  "Great for people who want clinical results without clinical appointments. It fits into my life in a way that monthly office visits never could. The compliance is the key — I actually do it.",
  "The design is beautiful. I leave it on my bathroom counter on display because it looks like a premium object. Function and aesthetics done right.",
  "I bought this for my wife and ended up stealing it for myself. We ended up buying a second one. The results are undeniable for both of us.",
  "I was wary because wellness products often exaggerate. This one under-promises and over-delivers. I've seen more improvement than the marketing claims, honestly.",
  "Five stars specifically because of the consistency of results. Week after week, the improvement has been real and visible. It doesn't plateau — it keeps getting better.",
  "I travel constantly and this was perfect for my bag. Compact, wireless, lightweight, and I never had to worry about converters. Skincare routine maintained on every trip.",
  "Three months in and I'm still getting better results. This isn't a quick fix — it's a genuine long-term improvement device. Patience + consistency = incredible results.",
  "The return policy gave me confidence to try it. But I never needed it. By week 3, returning it was the last thing on my mind.",
  "My 67-year-old mother has been using this for 8 weeks. The improvement in her skin elasticity is remarkable. She calls it her 'magic machine' and uses it religiously.",
  "I've recommended this to 7 people in my life. All 7 have messaged me back to say they're seeing results. That's not something I do lightly — this is genuinely good.",
  "My only regret is not starting sooner. The 6-week and 12-week marks showed such significant improvement. I should have started using this 2 years ago.",
  "I was a regular at my skincare clinic. I haven't gone back once since getting this. I'm getting equivalent results at home for a fraction of the ongoing cost.",
  "The device feels solid and well-made — you can immediately tell they didn't cut corners on the build. Three months later it works exactly as it did on day one.",
  "I researched this product for 3 months before buying. Read every review, watched every video. All of them were accurate. The results are exactly what was described.",
  "This has replaced several expensive products in my routine. Fewer things to buy, fewer things to use, and better results than when I was using them all. Incredible.",
  "I started noticing changes at the 10-day mark — subtle but definitely there. By week 4, people in my life were noticing without me mentioning anything.",
  "I bought the bundle deal and it was worth it for the savings. My sister and I share the skincare philosophy and having matching devices has made our routines fun.",
];

// ─── Review titles ─────────────────────────────────────────────────────────────
const MASK_TITLES = [
  'Replaced $1,800/year in clinic visits', 'The 633nm red light actually works',
  'My dermatologist was impressed', 'Skeptic turned believer at week 3',
  'The NIR mode changed my skin firmness', 'Blue light cleared my hormonal breakouts',
  'Wireless design = actually using it daily', 'Before/after photos are unbelievable',
  'Best purchase of my entire skincare journey', 'Clinical results without the clinic',
  'My skin care routine is now just this + SPF', 'Week-by-week the results compounded',
  'As an esthetician, I approve this device', '3 compliments in one week — it works',
  'Bought one for myself + my mom', 'The silicone fit is perfect for my face shape',
];

const GENERIC_TITLES = [
  'Absolutely exceeded my expectations', 'Best wellness purchase this year',
  'Worth every single penny', 'Results showed up faster than I expected',
  'My dermatologist noticed the difference', 'Gave this to my mom — she loves it',
  'Consistent use = consistent results', 'The skeptic in me is fully converted',
  'Premium quality, real results', 'Wish I had found this sooner',
  'Before and after photos are crazy', 'Everyone in my house is using it now',
  'Simple to use, powerful results', 'I tracked weekly — the data speaks',
  'This replaced three other products', 'The wireless convenience is huge',
  'Real improvement, not just placebo', 'My skin has never looked this good',
  'Five stars, genuinely mean it', 'Game changer for my routine',
];

// ─── Q&A pairs by product category ──────────────────────────────────────────
export const PRODUCT_QA = {
  '1798542129166426112': [
    {
      q: 'How long before I see results with the LED mask?',
      a: 'Most customers report noticing improved skin texture and brightness within 2–3 weeks of consistent daily use. More significant changes like reduced fine lines and improved firmness typically become visible around the 4–6 week mark. For best results, we recommend using it 5x per week for at least 20 minutes per session.',
      helpful: 234,
    },
    {
      q: 'Can I use the mask if I have sensitive or rosacea-prone skin?',
      a: 'Yes! Red light therapy is gentle and non-thermal — it does not heat the skin. Many of our customers with rosacea-prone and sensitive skin have reported that the 633nm red mode actually helps calm redness and inflammation over time. Start with shorter sessions (10 minutes) and build up.',
      helpful: 187,
    },
    {
      q: 'What is the difference between the red, blue, and NIR modes?',
      a: '633nm Red Light is best for anti-aging, collagen production, and overall skin rejuvenation. 415nm Blue Light targets acne-causing bacteria and is ideal for breakout-prone skin. 830nm Near-Infrared (NIR) penetrates deeper for cellular repair, reduced inflammation, and improved elasticity. Many users alternate modes based on their skin goals.',
      helpful: 312,
    },
    {
      q: 'Is it safe to use around the eye area?',
      a: 'The mask is designed with appropriate eye coverage. The LEDs are positioned to treat the face without direct contact with the eyes. Always follow the usage instructions and do not stare directly at the LEDs during use. If you have pre-existing eye conditions, consult your doctor before use.',
      helpful: 143,
    },
    {
      q: 'Can I use it with my existing serums?',
      a: 'Absolutely — and we recommend it! Applying a water-based serum before your LED session can enhance absorption during treatment. Avoid using products with retinoids, AHAs, or BHAs directly before a session as light therapy can increase skin sensitivity. Cleanse, apply your serum, then do your LED session.',
      helpful: 198,
    },
  ],
  _generic: [
    {
      q: 'How quickly does shipping take?',
      a: 'Standard tracked shipping takes 7-12 business days. Express shipping (add $9.99 at checkout) arrives in 3-5 business days. All orders ship within 1-3 business days from our fulfillment center and come with full DHL tracking.',
      helpful: 89,
    },
    {
      q: 'What does the 30-day guarantee cover?',
      a: 'Our 30-day money-back guarantee is completely risk-free. If you\'re not satisfied for any reason — results, quality, fit, anything — simply contact our support team within 30 days of delivery and we\'ll arrange a full refund. We even cover return shipping costs.',
      helpful: 167,
    },
    {
      q: 'How long does the battery last on a single charge?',
      a: 'Battery life varies by model, but most of our devices are designed for 60–90 minutes of continuous use per charge and recharge fully in under 2 hours. This means you can do 3–4+ daily sessions before needing to recharge.',
      helpful: 112,
    },
    {
      q: 'Is this product FDA cleared?',
      a: 'Our devices use FDA-cleared materials and components and comply with applicable safety standards. We are committed to using only medical-grade, safety-tested materials in our products.',
      helpful: 203,
    },
  ],
};

// ─── Seed reviews for specific product IDs ────────────────────────────────────
const SEED_REVIEWS = {
  '1798542129166426112': MASK_REVIEW_BODIES.map((body, i) => ({
    id: `mask-seed-${i}`,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_INITIALS[i % LAST_INITIALS.length]}`,
    location: US_CITIES[i % US_CITIES.length],
    rating: i < 17 ? 5 : (i < 19 ? 4 : 5),
    title: MASK_TITLES[i % MASK_TITLES.length],
    body,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i * 4 + Math.floor(Math.random() * 10))).toISOString().split('T')[0],
    verified: true,
    helpful: Math.floor(Math.random() * 80) + 5,
  })),
};

// ─── Generic review generator ─────────────────────────────────────────────────
const generateGenericReviews = (productId) => {
  const count = Math.floor(Math.random() * 60) + 120; // 120-180 reviews
  const reviews = [];

  for (let i = 0; i < count; i++) {
    // Realistic rating distribution:
    // 5★: 72%, 4★: 18%, 3★: 7%, 2★: 2%, 1★: 1%
    const rand = Math.random();
    let rating = 5;
    if (rand > 0.72 && rand < 0.90) rating = 4;
    else if (rand >= 0.90 && rand < 0.97) rating = 3;
    else if (rand >= 0.97 && rand < 0.99) rating = 2;
    else if (rand >= 0.99) rating = 1;

    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastInit = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
    const name = `${firstName} ${lastInit}`;
    const location = US_CITIES[Math.floor(Math.random() * US_CITIES.length)];
    const body = GENERIC_WELLNESS_BODIES[Math.floor(Math.random() * GENERIC_WELLNESS_BODIES.length)];
    const title = GENERIC_TITLES[Math.floor(Math.random() * GENERIC_TITLES.length)];

    // Spread dates: recent are more common, with a long tail over 1 year
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 365);
    const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * daysAgo).toISOString().split('T')[0];

    reviews.push({
      id: `gen-${productId}-${i}`,
      name,
      location,
      rating,
      title,
      body,
      date,
      verified: Math.random() > 0.04, // 96% verified
      helpful: Math.floor(Math.random() * 40) + 1,
    });
  }

  // Sort by newest first
  return reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ─── Store helpers ─────────────────────────────────────────────────────────────
const getAllReviewsStore = () => {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(SEED_REVIEWS));
    return { ...SEED_REVIEWS };
  } catch {
    return { ...SEED_REVIEWS };
  }
};

const saveStore = (store) => {
  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('reviewService: localStorage save failed', e);
  }
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Get reviews for a product.
 */
export const getReviews = (productId) => {
  const store = getAllReviewsStore();

  if (!store[productId] || store[productId].length < 50) {
    const fresh = productId === '1798542129166426112'
      ? [...(SEED_REVIEWS['1798542129166426112'] || []), ...generateGenericReviews(productId)]
      : generateGenericReviews(productId);

    store[productId] = fresh;
    saveStore(store);
    return fresh;
  }

  return store[productId];
};

/**
 * Add a new review.
 */
export const addReview = (productId, review) => {
  const store = getAllReviewsStore();

  const newReview = {
    id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: review.name || 'Anonymous',
    location: review.location || '',
    rating: Math.min(5, Math.max(1, parseInt(review.rating) || 5)),
    title: review.title || '',
    body: review.body || '',
    date: new Date().toISOString().split('T')[0],
    verified: false,
    helpful: 0,
  };

  if (!store[productId]) store[productId] = [];
  store[productId] = [newReview, ...store[productId]];
  saveStore(store);
  return newReview;
};

/**
 * Increment helpful vote for a review.
 */
export const voteHelpful = (productId, reviewId) => {
  const store = getAllReviewsStore();
  if (!store[productId]) return;

  store[productId] = store[productId].map(r =>
    r.id === reviewId ? { ...r, helpful: (r.helpful || 0) + 1 } : r
  );
  saveStore(store);
};

/**
 * Get aggregate rating data.
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
    distribution,
  };
};

/**
 * Get Q&A pairs for a product.
 */
export const getProductQA = (productId) => {
  return PRODUCT_QA[productId] || PRODUCT_QA['_generic'];
};

// Mock data for Phase 10 prototype.
// All values are illustrative; the real backend serves these from the v2 corpus.

window.GENRE_KEYS = [
  'adventure',
  'gothic_horror',
  'historical',
  'literary',
  'mystery',
  'romance',
  'speculative',
  'western',
];

window.GENRE_LABELS = {
  adventure:     'Adventure',
  gothic_horror: 'Gothic Horror',
  historical:    'Historical',
  literary:      'Literary',
  mystery:       'Mystery',
  romance:       'Romance',
  speculative:   'Speculative',
  western:       'Western',
};

// Tour copy — locked from the final spec, jargon reduced.
window.TOUR_STEPS = [
  {
    anchor: 'scatter-canvas',
    title:  'Each dot is a word.',
    body:   "Words from 154 books, arranged so similar-meaning words sit close together. Drag to rotate, scroll to zoom, press R to reset. You're seeing a 3D version of something that lives in higher dimensions — close enough to explore.",
  },
  {
    anchor: 'genre-select',
    title:  "Light up a genre.",
    body:   "Pick one — its signature words brighten, the common ones fade. Brightness shows how strongly a word belongs to that genre vs the others. Slide through individual books in that genre and watch the pattern shift, book by book.",
  },
  {
    anchor: 'upload-zone',
    title:  'Drop a book.',
    body:   "Drag in any .txt file. We compare its shape to each genre's shape and predict what it is — you'll get the three most likely genres with confidence scores, and the book itself shows up in the cloud with its own bright words highlighted.",
  },
  {
    anchor: 'topology-tab',
    title:  'Two more views worth a look.',
    body:   "Topology shows each genre as a shape, and tracks the holes that survive as you zoom out — a fingerprint the classifier actually uses. Compare puts two genres side-by-side. Both work from the full geometry, not the 3D view you've been rotating.",
  },
];

// Sample classification result for the upload simulation.
window.SAMPLE_CLASSIFICATION = {
  bookTitle: "The Castle of Otranto",
  topN: [
    { genre: 'gothic_horror', probability: 0.624 },
    { genre: 'mystery',       probability: 0.241 },
    { genre: 'literary',      probability: 0.087 },
    { genre: 'romance',       probability: 0.024 },
    { genre: 'adventure',     probability: 0.012 },
    { genre: 'historical',    probability: 0.008 },
    { genre: 'speculative',   probability: 0.003 },
    { genre: 'western',       probability: 0.001 },
  ],
  oovCount: 142,
  totalWords: 8431,
  uncertain: false,   // top1-top2 gap = 0.383, well above 0.28 threshold
  nearestBooks: [
    { title: "The Mysteries of Udolpho",   author: "Ann Radcliffe",        genre: 'gothic_horror', distance: 0.142 },
    { title: "Wuthering Heights",          author: "Emily Brontë",         genre: 'gothic_horror', distance: 0.187 },
    { title: "The Italian",                author: "Ann Radcliffe",        genre: 'gothic_horror', distance: 0.201 },
    { title: "Frankenstein",               author: "Mary Shelley",         genre: 'gothic_horror', distance: 0.223 },
    { title: "The Moonstone",              author: "Wilkie Collins",       genre: 'mystery',       distance: 0.241 },
  ],
  trackContrib: { topology: 0.58, vocabulary: 0.42 },
  drivingWords: ['castle', 'spectre', 'manfred', 'isabella', 'chapel', 'tomb', 'matilda', 'cavern', 'oath', 'haunted', 'shadow', 'fate'],
};

// Pipeline steps shown during upload simulation.
window.PIPELINE_STEPS = [
  { id: 'tokenize',  label: 'Tokenize',           ms: 420 },
  { id: 'tfidf',     label: 'TF-IDF weighting',   ms: 520 },
  { id: 'pointcloud',label: 'Build point cloud',  ms: 480 },
  { id: 'homology',  label: 'Persistent homology',ms: 820 },
  { id: 'features',  label: 'Feature vector',     ms: 380 },
  { id: 'classify',  label: 'Classify',           ms: 420 },
];

// Tour-anchor constants (mirrors src/tour/anchors.ts).
window.TOUR_ANCHORS = {
  scatterCanvas:        'scatter-canvas',
  genreSelect:          'genre-select',
  uploadZone:           'upload-zone',
  topologyTab:          'topology-tab',
  whyButton:            'why-button',
  classificationResult: 'classification-result',
  explainPanel:         'explain-panel',
  compareTab:           'compare-tab',
  helpMenu:             'help-menu',
  themeToggle:          'theme-toggle',
};

// =========================================================================
// Scatter point generation.
// =========================================================================
// Deterministic seeded random so the cloud is stable across renders.
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cluster centers per genre — roughly evenly spaced on a sphere.
const GENRE_CENTERS = {
  adventure:     [ 0.55, -0.05,  0.10],
  gothic_horror: [-0.40,  0.35,  0.00],
  historical:    [ 0.00, -0.50, -0.10],
  literary:      [ 0.10,  0.05,  0.00],   // center: literary is the "common" cluster
  mystery:       [-0.50, -0.20,  0.20],
  romance:       [ 0.30,  0.45, -0.10],
  speculative:   [-0.10,  0.20,  0.40],
  western:       [ 0.45, -0.40, -0.25],
};

// Sample a 2D-projected point: a Gaussian blob around the genre center,
// projected to (x, y) for the SVG. z is kept for potential 3D rendering.
function buildScatterPoints() {
  const rng = mulberry32(20260528);
  const points = [];
  const PER_GENRE = 80;     // ~640 total points; light enough for SVG
  for (const genre of window.GENRE_KEYS) {
    const [cx, cy, cz] = GENRE_CENTERS[genre];
    for (let i = 0; i < PER_GENRE; i++) {
      // Box-Muller for a more cluster-shaped distribution
      const u1 = rng(), u2 = rng();
      const rad = Math.sqrt(-2 * Math.log(u1)) * 0.10;
      const theta = 2 * Math.PI * u2;
      const dx = rad * Math.cos(theta);
      const dy = rad * Math.sin(theta);
      const dz = (rng() - 0.5) * 0.18;
      // a few outliers to make the cloud feel real
      const outlier = rng() < 0.03 ? 0.18 : 0;
      const ox = (rng() - 0.5) * outlier;
      const oy = (rng() - 0.5) * outlier;
      const x = cx + dx + ox;
      const y = cy + dy + oy;
      const z = cz + dz;
      // simulated TF-IDF: peaks near cluster center, drops with radius
      const tfidf = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 6);
      // Word labels are illustrative
      const word = (genre === 'literary' && tfidf > 0.7) ? 'consciousness'
                : (genre === 'mystery' && tfidf > 0.7) ? 'detective'
                : (genre === 'gothic_horror' && tfidf > 0.7) ? 'spectre'
                : null;
      points.push({ x, y, z, genre, tfidf, word });
    }
  }
  return points;
}
window.SCATTER_POINTS = buildScatterPoints();

// Project (x,y) to SVG coords given a viewBox of [0,0,W,H].
window.projectPoint = function(p, W, H) {
  // domain is roughly [-0.8, 0.8] for both axes after clustering
  const padX = W * 0.08, padY = H * 0.08;
  const sx = (W - 2 * padX) / 1.6;
  const sy = (H - 2 * padY) / 1.6;
  return [
    W / 2 + p.x * sx,
    H / 2 - p.y * sy,  // y flips
  ];
};

// Where the uploaded book lands (between gothic_horror and mystery, leaning gothic).
window.UPLOAD_LANDING = { x: -0.42, y: 0.20, z: 0.10 };

/**
 * Shilpika (शिल्पिका) — Interactive Web Client (PRD v4)
 * Voice-first, AI-native craft commerce: quality-gated Visual AI, Vani catalog,
 * Value 3-tier pricing, provenance cards, Nilaam auctions, Awaaz Milan, Saathi AI.
 * Connects to NestJS backend at /api/v1. Degrades gracefully to demo mode.
 */

const API_BASE = '/api/v1';
const WISHLIST_KEY = 'aam-wishlist';

// ---------------------------------------------------------------------------
// Craft presets — demo data used when the API is unavailable.
// Provenance fields feed the Anti-Exploitation Card (PRD FR 2.1.1).
// ---------------------------------------------------------------------------
const SAMPLE_CRAFT_PRESETS = [
  {
    id: 'terracotta',
    name: 'Odisha Terracotta Moon Pot',
    titleHindi: 'ओडिशा टेराकोटा बर्तन',
    craft: 'Terracotta',
    category: 'Pottery',
    region: 'Odisha',
    regionLabel: 'Odisha terracotta',
    beforeImg: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=600&q=80',
    afterImg: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
    speechHindi: 'यह हाथ से बनी ओडिशा की टेराकोटा मिट्टी की सुराही है। इसे लाल मिट्टी से चाक पर आकार देकर भट्टी में पकाया गया है। ऊपर की नक्काशी पारंपरिक आदिवासी चित्रकला से प्रेरित है।',
    speechEnglish: 'This is a hand-thrown terracotta moon pot from Odisha, shaped on the wheel from local red clay and fired in a traditional kiln, engraved with motifs inspired by regional tribal art.',
    materialCost: 80, laborCost: 220, transportCost: 40,
    marketMin: 380, marketMax: 650,
    lineage: 'Mahapatra family kumbhar workshop',
    generations: '4th generation',
    hours: 50,
    story: 'Terracotta has been shaped in Odisha for centuries, carrying the red of the local soil into vessels, roof tiles and votive figures. This moon pot is thrown on a kick-wheel, dried in shade to prevent cracks, burnished by hand and fired on an open kiln — the engraved band across its shoulder echoes motifs painted on Odisha\'s temple terracotta. Every piece varies slightly in tone because the clay and fire, not a machine, decide the final colour.',
    artForm: 'Odisha terracotta',
  },
  {
    id: 'silk',
    name: 'Banarasi Silk Saree',
    titleHindi: 'शुद्ध बनारसी रेशम की साड़ी',
    craft: 'Banarasi Weaving',
    category: 'Textile',
    region: 'Uttar Pradesh',
    regionLabel: 'Varanasi handloom',
    beforeImg: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    afterImg: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
    speechHindi: 'यह शुद्ध बनारसी रेशम की साड़ी है, जिस पर जरी का काम किया गया है। इसे हथकरघे पर बुनने में 15 दिन लगे हैं। शादी और त्योहारों के लिए विशेष रूप से बनाई गई है।',
    speechEnglish: 'Pure handloom Banarasi silk saree with intricate gold zari brocade work, handcrafted on traditional pit looms over 15 days in Varanasi.',
    materialCost: 3500, laborCost: 4500, transportCost: 300,
    marketMin: 6500, marketMax: 11000,
    lineage: 'Ansari weaving atelier',
    generations: '5th generation',
    hours: 120,
    story: 'Banarasi brocade is woven on pit looms in Varanasi, where design cards guide the zari threads through the silk weft. A single saree can pass through three sets of hands — dyer, designer and weaver — over roughly fifteen days. The zari tradition it draws on has been practised in the city\'s weaving lanes for generations, and every motif is still punched and set by hand before the first shuttle flies.',
    artForm: 'Banarasi brocade',
  },
  {
    id: 'kurta',
    name: 'Lucknawi Chikankari Kurta',
    titleHindi: 'चिकनकारी हस्तकढ़ाई कुर्ता',
    craft: 'Chikankari',
    category: 'Clothing',
    region: 'Uttar Pradesh',
    regionLabel: 'Lucknow embroidery',
    beforeImg: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
    afterImg: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
    speechHindi: 'यह सूती मलमल पर महीन चिकनकारी कढ़ाई का कुर्ता है। 400 साल पुरानी लखनवी परंपरा के अनुसार 32 टांकों से हाथ से तैयार किया गया है।',
    speechEnglish: 'Fine cotton muslin kurta hand-embroidered with delicate shadow-work Chikankari stitches preserving 400-year-old Lucknow royal craftsmanship.',
    materialCost: 500, laborCost: 1200, transportCost: 100,
    marketMin: 1400, marketMax: 2400,
    lineage: 'Lucknow chikankar collective',
    generations: '3rd generation',
    hours: 70,
    story: 'Chikankari began as court embroidery in Awadh and survives in Lucknow\'s narrow workshops as a family trade. This kurta carries shadow-work — the bhakhiya stitch worked on the reverse so a soft outline shows through the muslin — alongside murri and phanda knots. The pattern is block-printed in washable ink first, then filled entirely by hand, stitch by stitch, over weeks.',
    artForm: 'Chikankari',
  },
  {
    id: 'brass',
    name: 'Moradabad Brass Diya Set',
    titleHindi: 'पीतल का दीया सेट',
    craft: 'Metalwork',
    category: 'Home Decor',
    region: 'Uttar Pradesh',
    regionLabel: 'Moradabad brass',
    beforeImg: 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=600&q=80',
    afterImg: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    speechHindi: 'यह मुरादाबाद का शुद्ध पीतल का दिया सेट है। हाथ से की गई नक्काशी और भारी वजन इसे दिवाली और पूजा के लिए श्रेष्ठ बनाते हैं।',
    speechEnglish: 'Hand-carved heavy brass puja diya set crafted by master artisans in Moradabad with intricate floral engraving.',
    materialCost: 200, laborCost: 250, transportCost: 50,
    marketMin: 400, marketMax: 700,
    lineage: 'Moradabad engraved-brass workshop',
    generations: '3rd generation',
    hours: 30,
    story: 'Moradabad\'s brass bazaars have cast and engraved metal for the world for over a century. This diya set is sand-cast, hand-turned on the lathe and then chased with floral engraving freehand — no two sets carry identical lines. The weight in the hand is the tell of solid brass rather than plated sheet.',
    artForm: 'Engraved brass',
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  currentRole: 'artisan',
  authToken: null,
  apiOnline: false,
  currentWizardStep: 1,
  selectedPreset: SAMPLE_CRAFT_PRESETS[0],
  isRecording: false,
  recTimerInterval: null,
  recSeconds: 0,
  speechRecognition: null,
  currentTranscript: '',
  currentCatalog: null,
  currentCosts: { material: 80, labor: 220, transport: 40, margin: 25 },
  recommendedPrice: { floor: 0, b2c: 0, b2b: 0 },
  marketplaceProducts: [],
  feedLoaded: false,
  selectedProductDetail: null,
  searchQuery: '',
  selectedCategory: 'all',
  sortBy: 'newest',
  wishlist: new Set(JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]')),
  voiceCloneReady: false,
  auction: {
    items: [],
    selectedId: null,
    tickInterval: null,
  },
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  bindNavigation();
  bindWizardControls();
  bindBeforeAfterSlider();
  bindVoiceControls();
  bindMarketplaceControls();
  bindModalControls();
  bindAuctionControls();
  bindSaathiControls();
  setupSpeechRecognition();
  renderPresetThumbs();
  updateBeforeAfterImages();
  initAuctions();

  checkApiHealth();
  await authenticateArtisan();
  await Promise.all([loadMarketplaceFeed(), loadArtisanDashboard()]);
});

async function checkApiHealth() {
  const badge = $('api-status-badge');
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3500) });
    state.apiOnline = res.ok;
  } catch {
    state.apiOnline = false;
  }
  if (badge) {
    badge.classList.toggle('offline', !state.apiOnline);
    $('api-status-text').textContent = state.apiOnline ? 'Local API live' : 'Demo mode';
  }
  if (!state.apiOnline) showToast('Backend not reachable — browsing with sample data.', 'info');
}

async function authenticateArtisan() {
  try {
    const res = await fetch(`${API_BASE}/auth/dev-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'devki-odisha', role: 'artisan' }),
    });
    if (res.ok) state.authToken = (await res.json()).token;
  } catch { /* demo mode */ }
}

// ---------------------------------------------------------------------------
// Navigation (roles, views)
// ---------------------------------------------------------------------------
const ROLE_VIEWS = {
  artisan: 'artisan-dashboard-view',
  buyer: 'marketplace-view',
  auction: 'auction-view',
  admin: 'admin-analytics-view',
};

function bindNavigation() {
  document.querySelectorAll('.role-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchRole(btn.dataset.role));
  });
  document.querySelectorAll('[data-goto-role]').forEach((btn) => {
    btn.addEventListener('click', () => switchRole(btn.dataset.gotoRole));
  });
}

function switchRole(role) {
  state.currentRole = role;
  document.querySelectorAll('.role-btn').forEach((b) => b.classList.toggle('active', b.dataset.role === role));
  showView(ROLE_VIEWS[role]);
  if (role === 'buyer' || role === 'admin') loadMarketplaceFeed();
  if (role === 'auction') startAuctionTicker();
  if (role === 'admin') renderAdminView();
}

function showView(id) {
  closeWizard();
  document.querySelectorAll('.view').forEach((v) => {
    const active = v.id === id;
    v.hidden = !active;
    v.classList.toggle('active', active);
  });
}

// ---------------------------------------------------------------------------
// Artisan dashboard
// ---------------------------------------------------------------------------
async function loadArtisanDashboard() {
  try {
    const res = await fetch(`${API_BASE}/marketplace/feed?page=1&limit=50`);
    if (!res.ok) throw new Error('feed');
    const data = await res.json();
    const products = data.data || [];
    const totalViews = products.reduce((s, p) => s + (p.viewCount || 0), 0);
    const totalInquiries = products.reduce((s, p) => s + (p.inquiryCount || 0), 0);
    const totalHours = products.reduce((s, p) => s + (p.laborHours || 0), 0);

    $('stat-products-count').textContent = formatNum(products.length);
    $('stat-views-count').textContent = formatNum(totalViews);
    $('stat-inquiries-count').textContent = formatNum(totalInquiries);
    $('stat-hours-count').textContent = formatNum(totalHours);

    renderRecentProducts(products.slice(0, 4));
  } catch {
    const demo = demoProducts();
    $('stat-products-count').textContent = formatNum(demo.length);
    $('stat-views-count').textContent = formatNum(demo.reduce((s, p) => s + (p.viewCount || 0), 0));
    $('stat-inquiries-count').textContent = formatNum(demo.reduce((s, p) => s + (p.inquiryCount || 0), 0));
    $('stat-hours-count').textContent = formatNum(demo.reduce((s, p) => s + (p.laborHours || 0), 0));
    renderRecentProducts(demo.slice(0, 4));
  }
}

function renderRecentProducts(products) {
  const container = $('artisan-recent-products');
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-basket" aria-hidden="true"></i>
        <h4>Your shelf is waiting</h4>
        <p>Capture one photo, speak a few sentences, and your first listing goes live.</p>
        <button class="btn-primary" type="button" onclick="startAddProduct()">
          <i class="ph-bold ph-camera-plus"></i> Add your first product
        </button>
      </div>`;
    return;
  }

  container.innerHTML = products.map((p) => `
    <button class="recent-card" type="button" data-product="${esc(p.id)}">
      <img class="recent-thumb" src="${esc(p.thumbnailUrl || sampleImageFor(p.category))}" alt="" loading="lazy">
      <span class="recent-body">
        <span class="recent-title">${esc(p.title)}</span>
        <span class="recent-meta">${esc(p.category || 'Handicraft')} · ${esc(p.region || 'India')}</span>
      </span>
      <span class="recent-side">
        <span class="recent-price">₹${formatNum(p.priceMin || 450)}–₹${formatNum(p.priceMax || 650)}</span>
        <span class="status-tag status-${esc(p.status || 'published')}">${esc(p.status || 'published')}</span>
      </span>
    </button>`).join('');

  container.querySelectorAll('[data-product]').forEach((el) => {
    el.addEventListener('click', () => openProductModal(el.dataset.product));
  });
}

// ---------------------------------------------------------------------------
// Marketplace feed
// ---------------------------------------------------------------------------
function bindMarketplaceControls() {
  const search = $('marketplace-search');
  let debounce;
  search.addEventListener('input', () => {
    $('search-clear-btn').hidden = search.value.length === 0;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.searchQuery = search.value.trim();
      loadMarketplaceFeed();
    }, 300);
  });

  $('search-clear-btn').addEventListener('click', () => {
    search.value = '';
    state.searchQuery = '';
    $('search-clear-btn').hidden = true;
    loadMarketplaceFeed();
    search.focus();
  });

  $('marketplace-sort').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderMarketplaceProducts(getVisibleProducts());
  });

  document.querySelectorAll('.cat-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedCategory = chip.dataset.category;
      loadMarketplaceFeed();
    });
  });

  $('clear-filters-btn').addEventListener('click', () => {
    state.searchQuery = '';
    state.selectedCategory = 'all';
    search.value = '';
    $('search-clear-btn').hidden = true;
    document.querySelectorAll('.cat-chip').forEach((c) => c.classList.toggle('active', c.dataset.category === 'all'));
    loadMarketplaceFeed();
  });
}

async function loadMarketplaceFeed() {
  const grid = $('marketplace-grid');
  grid.innerHTML = Array.from({ length: 6 }, skeletonCard).join('');

  try {
    let url = `${API_BASE}/marketplace/feed?page=1&limit=50`;
    if (state.selectedCategory !== 'all') url += `&category=${encodeURIComponent(state.selectedCategory)}`;
    if (state.searchQuery) url += `&q=${encodeURIComponent(state.searchQuery)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('feed');
    const result = await res.json();
    state.marketplaceProducts = result.data || [];
    state.feedLoaded = true;
  } catch {
    if (!state.feedLoaded) {
      state.marketplaceProducts = demoProducts();
      state.feedLoaded = true;
    }
  }

  updateCategoryChipCounts();
  renderMarketplaceProducts(getVisibleProducts());
}

function getVisibleProducts() {
  let list = [...state.marketplaceProducts];
  if (state.selectedCategory !== 'all') {
    const cat = state.selectedCategory.toLowerCase();
    list = list.filter((p) => (p.category || '').toLowerCase().includes(cat));
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter((p) =>
      [p.title, p.titleHindi, p.craft, p.region, p.category].some((f) => (f || '').toLowerCase().includes(q)));
  }
  switch (state.sortBy) {
    case 'price-asc': list.sort((a, b) => (a.priceMin || 0) - (b.priceMin || 0)); break;
    case 'price-desc': list.sort((a, b) => (b.priceMax || 0) - (a.priceMax || 0)); break;
    case 'popular': list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)); break;
    default: break;
  }
  return list;
}

function renderMarketplaceProducts(products) {
  const grid = $('marketplace-grid');
  const hasFilters = state.selectedCategory !== 'all' || !!state.searchQuery;

  $('results-count').textContent = `${products.length} handcrafted ${products.length === 1 ? 'piece' : 'pieces'}`;
  $('clear-filters-btn').hidden = !hasFilters;

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
        <h4>No crafts match your search</h4>
        <p>Try a different keyword or explore another category of handmade work.</p>
        <button class="btn-ghost" type="button" onclick="document.getElementById('clear-filters-btn').click()">
          <i class="ph ph-broom"></i> Clear filters
        </button>
      </div>`;
    return;
  }

  grid.innerHTML = products.map((p) => {
    const saved = state.wishlist.has(p.id);
    return `
      <article class="product-card" data-product="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.title)}">
        <div class="product-media">
          <img src="${esc(p.thumbnailUrl || sampleImageFor(p.category))}" alt="${esc(p.title)}" loading="lazy">
          <span class="region-badge"><i class="ph ph-map-pin" aria-hidden="true"></i> ${esc(p.region || 'India')}</span>
          <button class="wish-btn ${saved ? 'saved' : ''}" data-wish="${esc(p.id)}" type="button"
                  aria-pressed="${saved}" aria-label="${saved ? 'Remove from' : 'Save to'} wishlist">
            <i class="ph${saved ? '-fill' : ''} ph-heart" aria-hidden="true"></i>
          </button>
        </div>
        <div class="product-body">
          <div>
            <div class="product-title">${esc(p.title)}</div>
            ${p.titleHindi ? `<div class="product-hindi">${esc(p.titleHindi)}</div>` : ''}
          </div>
          <div class="product-artisan">
            <span class="artisan-avatar" aria-hidden="true">${initials(p.artisanName || 'Devki')}</span>
            ${esc(p.artisanName || 'Devki')}
            <span class="provenance-mini" title="Cultural provenance verified"><i class="ph-fill ph-seal-check" aria-hidden="true"></i></span>
          </div>
          <div class="product-foot">
            <span class="product-price">₹${formatNum(p.priceMin || 500)}–₹${formatNum(p.priceMax || 800)}</span>
            <span class="product-views"><i class="ph ph-eye" aria-hidden="true"></i> ${formatNum(p.viewCount || 0)}</span>
          </div>
        </div>
      </article>`;
  }).join('');

  bindProductCards(grid);
}

function bindProductCards(scope) {
  scope.querySelectorAll('[data-product]').forEach((card) => {
    card.addEventListener('click', () => openProductModal(card.dataset.product));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProductModal(card.dataset.product); }
    });
  });
  scope.querySelectorAll('[data-wish]').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleWishlist(btn.dataset.wish); });
  });
}

function skeletonCard() {
  return `
    <div class="skeleton" aria-hidden="true">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-body">
        <div class="skeleton-line w60"></div>
        <div class="skeleton-line w40"></div>
      </div>
    </div>`;
}

function demoProducts() {
  return SAMPLE_CRAFT_PRESETS.map((p, i) => ({
    id: `demo-${p.id}`,
    title: p.name,
    titleHindi: p.titleHindi,
    description: p.speechEnglish,
    story: p.story,
    category: p.category,
    craft: p.craft,
    region: p.region,
    priceMin: Math.round(p.marketMin * 1.1),
    priceMax: Math.round(p.marketMax * 0.95),
    thumbnailUrl: p.afterImg,
    viewCount: 120 - i * 17,
    inquiryCount: 3 - (i % 3),
    laborHours: p.hours,
    lineage: p.lineage,
    generations: p.generations,
    materialCost: p.materialCost,
    laborCost: p.laborCost,
    transportCost: p.transportCost,
    artisanName: 'Devki',
    tags: ['handmade', 'heritage', p.craft.toLowerCase()],
  }));
}

function updateCategoryChipCounts() {
  document.querySelectorAll('.cat-chip[data-category]').forEach((chip) => {
    const cat = chip.dataset.category;
    const count = cat === 'all'
      ? state.marketplaceProducts.length
      : state.marketplaceProducts.filter((p) => (p.category || '').toLowerCase().includes(cat.toLowerCase())).length;
    let badge = chip.querySelector('.cat-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cat-count';
      chip.appendChild(badge);
    }
    badge.textContent = count;
  });
}

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------
function toggleWishlist(productId) {
  const had = state.wishlist.has(productId);
  if (had) state.wishlist.delete(productId);
  else state.wishlist.add(productId);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify([...state.wishlist]));

  document.querySelectorAll(`[data-wish="${productId}"]`).forEach((btn) => {
    const now = state.wishlist.has(productId);
    btn.classList.toggle('saved', now);
    btn.setAttribute('aria-pressed', now);
    btn.setAttribute('aria-label', `${now ? 'Remove from' : 'Save to'} wishlist`);
    btn.innerHTML = `<i class="ph${now ? '-fill' : ''} ph-heart" aria-hidden="true"></i>`;
  });
  showToast(had ? 'Removed from wishlist' : 'Saved to your wishlist', 'info');
}

// ---------------------------------------------------------------------------
// Product detail modal
// ---------------------------------------------------------------------------
function bindModalControls() {
  $('modal-close-btn').addEventListener('click', closeProductModal);
  $('product-detail-modal').addEventListener('click', (e) => {
    if (e.target === $('product-detail-modal')) closeProductModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('product-detail-modal').classList.contains('active')) closeProductModal();
  });
  $('listen-story-btn').addEventListener('click', playProductAudio);
  $('modal-wish-btn').addEventListener('click', () => {
    if (state.selectedProductDetail) toggleWishlist(state.selectedProductDetail.id);
  });
  $('share-product-btn').addEventListener('click', shareProduct);
  $('inquiry-form').addEventListener('submit', submitBuyerInquiry);
  $('btn-download-certificate').addEventListener('click', downloadCertificate);
  $('awaaz-form').addEventListener('submit', runAwaazMilan);
  $('btn-awaaz-play').addEventListener('click', playAwaazReply);
}

function productTiers(p) {
  // Advisory three-tier math per PRD FR 1.3.2. For API products without cost
  // breakdown, tiers are derived back from the B2C anchor range.
  const cost = (p.materialCost ?? 0) + (p.laborCost ?? 0) + (p.transportCost ?? 0);
  const floor = cost || Math.round((p.priceMin || 500) / 1.25);
  const b2c = Math.round((p.priceMin + p.priceMax) / 2) || floor;
  const b2b = Math.max(Math.round(b2c * 1.8), p.priceMax || 0);
  return { floor, b2c, b2b };
}

function openProductModal(productId) {
  const product = state.marketplaceProducts.find((p) => p.id === productId)
    || demoProducts().find((p) => p.id === productId);
  if (!product) return;

  state.selectedProductDetail = product;
  const saved = state.wishlist.has(product.id);
  const wishBtn = $('modal-wish-btn');
  wishBtn.classList.toggle('saved', saved);
  wishBtn.setAttribute('aria-pressed', saved);
  wishBtn.innerHTML = `<i class="ph${saved ? '-fill' : ''} ph-heart" aria-hidden="true"></i>`;

  const tiers = productTiers(product);
  $('modal-product-img').src = product.thumbnailUrl || sampleImageFor(product.category);
  $('modal-product-img').alt = product.title;
  $('modal-product-craft').textContent = `${product.craft || 'Traditional handicraft'} · ${product.material || 'Natural materials'}`;
  $('modal-product-title').textContent = product.title;
  $('modal-product-hindi-title').textContent = product.titleHindi || '';
  $('modal-product-price').textContent = `₹${formatNum(product.priceMin || 500)} – ₹${formatNum(product.priceMax || 800)}`;
  $('modal-product-origin').innerHTML = `<i class="ph ph-map-pin" aria-hidden="true"></i> ${esc(product.origin || product.region || 'India')}`;
  $('modal-tier-floor').textContent = formatNum(tiers.floor);
  $('modal-tier-b2c').textContent = formatNum(tiers.b2c);
  $('modal-tier-b2b').textContent = formatNum(tiers.b2b);
  $('modal-product-desc').textContent = product.description || 'Authentic handcrafted piece made with natural materials and traditional techniques.';

  const tags = Array.isArray(product.tags) ? product.tags : (product.tags || '').split(',');
  $('modal-product-tags').innerHTML = tags.filter(Boolean).slice(0, 6).map((t) => `<span class="tag-pill">#${esc(t.trim())}</span>`).join('');

  // Provenance card (FR 2.1)
  const prov = provenanceFor(product);
  $('modal-provenance-line').innerHTML =
    `<strong>${esc(prov.artForm)}</strong> · ${esc(prov.lineage)} · ${esc(prov.generations)} · ` +
    `<strong>${formatNum(prov.hours)} human hours</strong> on this piece.`;
  $('modal-provenance-hash').textContent = `Provenance hash (demo): ${demoHash(product.id)} · optional Solana mint`;

  const artisan = product.artisanName || 'Devki';
  $('modal-artisan-name').textContent = artisan;
  $('modal-artisan-avatar').textContent = initials(artisan);

  $('inquiry-message').value = '';
  $('awaaz-reply').hidden = true;
  resetAwaazStages();

  const modal = $('product-detail-modal');
  modal.classList.add('active');
  $('modal-close-btn').focus();

  fetch(`${API_BASE}/products/${productId}`).catch(() => {}); // view counter
}

function provenanceFor(product) {
  if (product.lineage && product.laborHours) {
    return { artForm: product.craft || product.category || 'Heritage craft', lineage: product.lineage, generations: product.generations || 'family tradition', hours: product.laborHours };
  }
  const preset = SAMPLE_CRAFT_PRESETS.find((p) => (product.craft || '').toLowerCase().includes(p.craft.toLowerCase()))
    || SAMPLE_CRAFT_PRESETS.find((p) => product.category === p.category)
    || SAMPLE_CRAFT_PRESETS[0];
  return { artForm: preset.artForm, lineage: preset.lineage, generations: preset.generations, hours: preset.hours };
}

function closeProductModal() {
  $('product-detail-modal').classList.remove('active');
  state.selectedProductDetail = null;
}

function playProductAudio() {
  const p = state.selectedProductDetail;
  if (!p) return;
  const text = p.titleHindi ? `${p.titleHindi}। ${p.description || ''}` : (p.description || p.title);
  speakAloud(text);
  showToast('Playing the artisan\'s story…', 'info');
}

async function shareProduct() {
  const p = state.selectedProductDetail;
  if (!p) return;
  const url = `${location.origin}/#product-${p.id}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Product link copied to clipboard', 'success');
  } catch {
    showToast('Could not copy the link', 'error');
  }
}

async function submitBuyerInquiry(e) {
  e.preventDefault();
  const product = state.selectedProductDetail;
  if (!product) return;
  const message = $('inquiry-message').value.trim();
  if (!message) return;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
      body: JSON.stringify({ productId: product.id, message }),
    });
    showToast(res.ok ? 'Inquiry sent! The artisan will reply soon.' : 'Inquiry saved in demo mode.', 'success');
    $('inquiry-message').value = '';
    closeProductModal();
  } catch {
    showToast('Inquiry saved in demo mode.', 'success');
    closeProductModal();
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Digital Certificate of Authenticity (FR 2.1.3) — downloadable SVG
// ---------------------------------------------------------------------------
function demoHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'sha256-' + h.toString(16).padStart(8, '0') + 'f2c41a' + str.length.toString(16);
}

function downloadCertificate() {
  const p = state.selectedProductDetail;
  if (!p) return;
  const prov = provenanceFor(p);
  const hash = demoHash(p.id);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="560" viewBox="0 0 840 560">
  <rect width="840" height="560" fill="#f6f0e6"/>
  <rect x="26" y="26" width="788" height="508" fill="none" stroke="#96500f" stroke-width="3"/>
  <rect x="36" y="36" width="768" height="488" fill="none" stroke="#d4c4a8" stroke-width="1"/>
  <text x="420" y="92" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#2b2118">Shilpika शिल्पिका</text>
  <text x="420" y="124" text-anchor="middle" font-family="Georgia, serif" font-size="15" letter-spacing="4" fill="#96500f">CERTIFICATE OF AUTHENTICITY</text>
  <line x1="300" y1="145" x2="540" y2="145" stroke="#d4c4a8" stroke-width="1"/>
  <text x="420" y="205" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#2b2118">${esc(p.title)}</text>
  <text x="420" y="245" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#5c4f41">handcrafted by ${esc(p.artisanName || 'Devki')} · ${esc(p.region || 'India')}</text>
  <text x="420" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#5c4f41">Art form: ${esc(prov.artForm)}   ·   Lineage: ${esc(prov.lineage)}</text>
  <text x="420" y="328" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#5c4f41">${esc(prov.generations)}   ·   ${prov.hours} human hours on this piece</text>
  <text x="420" y="392" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#55642e">This listing carries verified cultural provenance and credits its originators.</text>
  <text x="420" y="412" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#55642e">Appropriation without attribution is recorded and challenged.</text>
  <text x="420" y="480" text-anchor="middle" font-family="Menlo, monospace" font-size="11" fill="#7a6a56">Provenance hash: ${hash}</text>
  <text x="420" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#7a6a56">Issued ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · optional Solana mint pending</text>
</svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shilpika-certificate-${(p.id || 'artifact').replace(/[^\w-]/g, '')}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Certificate of Authenticity downloaded', 'success');
}

// ---------------------------------------------------------------------------
// Awaaz Milan — cross-language voice negotiation (demo pipeline)
// ---------------------------------------------------------------------------
function resetAwaazStages() {
  document.querySelectorAll('.awaaz-stage').forEach((s) => s.classList.remove('run', 'done'));
}

async function runAwaazMilan(e) {
  e.preventDefault();
  const question = $('awaaz-input').value.trim();
  if (!question || !state.selectedProductDetail) return;
  $('awaaz-input').value = '';

  const stages = { stt: document.querySelector('[data-awaaz="stt"]'), translate: document.querySelector('[data-awaaz="translate"]'), tts: document.querySelector('[data-awaaz="tts"]') };
  resetAwaazStages();

  const step = async (el, ms) => {
    el.classList.add('run');
    await new Promise((r) => setTimeout(r, ms));
    el.classList.remove('run');
    el.classList.add('done');
  };

  await step(stages.stt, 700);   // Speech-to-Text
  await step(stages.translate, 800); // Gemini translation (logged both sides)
  await step(stages.tts, 700);   // ElevenLabs cloned-voice TTS / Dubbing

  $('awaaz-reply-text').textContent = awaazReplyFor(question, state.selectedProductDetail);
  $('awaaz-reply').hidden = false;
}

function awaazReplyFor(question, product) {
  const q = question.toLowerCase();
  const prov = provenanceFor(product);
  if (q.includes('diwali') || q.includes('days') || q.includes('time') || q.includes('deadline')) {
    return 'Devki says: "I can finish two more pieces in twelve days if the clay weather holds. Tell me your date and I will not promise what I cannot fire."';
  }
  if (q.includes('price') || q.includes('discount') || q.includes('cheap') || q.includes('₹')) {
    return `Devki says: "The price you see is my fair B2C price — ${formatNum(product.priceMin || 500)} to ${formatNum(product.priceMax || 800)} rupees. For export orders I use a different rate. I do not discount below the floor, because the floor is my labour."`;
  }
  if (q.includes('custom') || q.includes('size') || q.includes('bulk') || q.includes('order')) {
    return 'Devki says: "Yes, I take custom orders. Send me the size and quantity in an inquiry, and I will reply with what is honestly possible."';
  }
  if (q.includes('ship') || q.includes('deliver')) {
    return 'Devki says: "I pack in straw and corrugated boxes and ship across India in five to seven days. International shipping goes through the platform\'s export desk."';
  }
  return `Devki says: "Thank you for asking. This is ${prov.artForm} — ${prov.hours} hours of my hands are in this piece. Ask me about price, sizes, or shipping and I will answer plainly." (Translated from Odia · original transcript retained for audit.)`;
}

function playAwaazReply() {
  const text = $('awaaz-reply-text').textContent;
  if (text) {
    speakAloud(text);
    showToast('Demo playback uses browser TTS — connect ElevenLabs for Devki\'s cloned voice.', 'info');
  }
}

// ---------------------------------------------------------------------------
// Saathi AI — simple assistant for artisans (demo answers)
// ---------------------------------------------------------------------------
function bindSaathiControls() {
  $('saathi-fab').addEventListener('click', () => {
    const panel = $('saathi-panel');
    const open = panel.hidden;
    panel.hidden = !open;
    $('saathi-fab').setAttribute('aria-expanded', open);
    if (open) $('saathi-input').focus();
  });
  $('saathi-close').addEventListener('click', () => {
    $('saathi-panel').hidden = true;
    $('saathi-fab').setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('[data-saathi-q]').forEach((chip) => {
    chip.addEventListener('click', () => answerSaathi(chip.dataset.saathiQ));
  });
  $('saathi-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('saathi-input').value.trim();
    if (q) { $('saathi-input').value = ''; answerSaathi(q); }
  });
  $('btn-saathi-play').addEventListener('click', () => {
    const t = $('saathi-answer-text').textContent;
    if (t) speakAloud(t);
  });
}

function answerSaathi(question) {
  const q = question.toLowerCase();
  let answer;
  if (q.includes('ship') || q.includes('delhi') || q.includes('deliver')) {
    answer = 'Saathi: For shipping, pack the piece in straw or bubble wrap, place it in a double-walled corrugated box, and book a pickup from the Selling desk — domestic delivery usually takes 5–7 days. Fragile pottery should always travel double-boxed.';
  } else if (q.includes('trend') || q.includes('color') || q.includes('colour') || q.includes('festive')) {
    answer = 'Saathi: This festive season, buyers are favouring earthy terracotta tones, deep indigo, and ivory-and-gold combinations. Saree searches spike around Diwali and the wedding season from October to December — list stock early.';
  } else if (q.includes('auction') || q.includes('nilaam') || q.includes('bid')) {
    answer = 'Saathi: Nilaam is the live auction house. You list a rare piece with a reserve price; verified buyers bid in real time, and if anyone bids in the last minute the timer extends by two minutes so nobody can snipe it.';
  } else if (q.includes('price') || q.includes('pricing')) {
    answer = 'Saathi: Never sell below your floor price — materials plus labour. Shilpika Value suggests three tiers: floor (breakeven), standard B2C, and a premium export rate for collectors. Pricing is advisory; the decision is always yours.';
  } else if (q.includes('voice') || q.includes('clone') || q.includes('awaaz')) {
    answer = 'Saathi: Awaaz Milan clones your voice from a 15-second sample taken once at onboarding. After that, buyers hear your replies in your own voice, translated — you speak Odia, they hear you in English.';
  } else {
    answer = 'Saathi: I can help with shipping, pricing, festive trends, Nilaam auctions and Awaaz Milan. Try one of the suggestions below, or ask in your own words.';
  }
  $('saathi-answer-text').textContent = answer + ' (Demo answers — connect a Gemini key for live Saathi.)';
  $('saathi-answer').hidden = false;
}

// ---------------------------------------------------------------------------
// Nilaam — live heritage auction (FR 2.3)
// ---------------------------------------------------------------------------
function initAuctions() {
  const now = Date.now();
  state.auction.items = [
    {
      id: 'nilaam-dokra',
      title: 'Antique Dokra Ritual Elephant',
      hindi: 'प्राचीन डोकरा हाथी',
      artForm: 'Dhra Dhokra (lost-wax brass)',
      img: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
      reserve: 24000, currentBid: 31500, endsAt: now + 7 * 60000 + 32000,
      lineage: 'Dhokra foundry of Mayurbhanj · 3rd generation',
      bids: [
        { bidder: 'Collector #4211', amount: 31500, t: now - 45000 },
        { bidder: 'Gallery Kensho', amount: 29800, t: now - 120000 },
        { bidder: 'Collector #1887', amount: 27250, t: now - 240000 },
      ],
    },
    {
      id: 'nilaam-tanjore',
      title: 'Tanjore Painting, Gilded Panel',
      hindi: 'तंजावर चित्रकला',
      artForm: 'Tanjore (Mysore gesso work)',
      img: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
      reserve: 40000, currentBid: 36500, endsAt: now + 3 * 60000 + 10000,
      lineage: 'Thanjavur studio lineage · 4th generation',
      bids: [
        { bidder: 'Collector #0912', amount: 36500, t: now - 80000 },
        { bidder: 'Heritage Trust BLR', amount: 34000, t: now - 200000 },
      ],
    },
    {
      id: 'nilaam-banarasi',
      title: 'Real Zari Banarasi, 1970s Heirloom',
      hindi: 'असली ज़री की बनारसी',
      artForm: 'Banarasi kadwa weaving',
      img: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
      reserve: 60000, currentBid: 72000, endsAt: now + 11 * 60000,
      lineage: 'Ansari atelier archive piece',
      bids: [
        { bidder: 'Museum of Textiles', amount: 72000, t: now - 60000 },
        { bidder: 'Collector #4211', amount: 69500, t: now - 180000 },
        { bidder: 'Collector #7734', amount: 66000, t: now - 300000 },
      ],
    },
  ];
}

function bindAuctionControls() {
  $('btn-place-bid').addEventListener('click', placeBid);
}

function startAuctionTicker() {
  reviveClosedAuctions();
  renderAuctionList();
  if (!state.auction.tickInterval) {
    state.auction.tickInterval = setInterval(auctionTick, 1000);
  }
}

// Demo continuity: when auctions lapse, a fresh Nilaam session opens.
function reviveClosedAuctions() {
  const now = Date.now();
  let revived = false;
  state.auction.items.forEach((a, i) => {
    if (a.endsAt <= now) {
      a.endsAt = now + (6 + i * 3) * 60000;
      a.reopenAt = null;
      revived = true;
    }
  });
  if (revived) showToast('New Nilaam session started — bidding is live.', 'info');
}

function auctionTick() {
  if (state.currentRole !== 'auction') return;
  const now = Date.now();

  // Simulated competing bidders keep the ticker alive
  state.auction.items.forEach((a) => {
    if (a.endsAt < now) return;
    if (Math.random() < 0.012) {
      const amount = a.currentBid + 500 * (1 + Math.floor(Math.random() * 3));
      a.currentBid = amount;
      a.bids.unshift({ bidder: `Collector #${1000 + Math.floor(Math.random() * 9000)}`, amount, t: now });
    }
  });

  // Reopen closed auctions ~20s after they end so the demo room is never dead.
  state.auction.items.forEach((a) => {
    if (a.endsAt <= now) {
      if (!a.reopenAt) a.reopenAt = now + 20000;
      else if (now >= a.reopenAt) {
        a.endsAt = now + 6 * 60000;
        a.reopenAt = null;
        showToast(`New session open: ${a.title}`, 'info');
      }
    }
  });

  renderAuctionList();
  renderAuctionPanel(false);
}

function fmtTimeLeft(ms) {
  if (ms <= 0) return 'closed';
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function renderAuctionList() {
  const list = $('auction-list');
  const now = Date.now();
  list.innerHTML = state.auction.items.map((a) => {
    const selected = a.id === state.auction.selectedId;
    const left = a.endsAt - now;
    const closed = left <= 0;
    return `
      <button class="auction-item ${selected ? 'selected' : ''}" type="button" data-auction="${a.id}">
        <img class="auction-thumb" src="${a.img}" alt="" loading="lazy">
        <span class="auction-info">
          <span class="auction-title">${esc(a.title)}</span>
          <span class="hindi-text auction-meta">${esc(a.hindi)} · ${esc(a.artForm)}</span>
          <span class="auction-meta"><i class="ph ph-tree-structure" aria-hidden="true"></i> ${esc(a.lineage)}</span>
          <span class="auction-row">
            <span class="auction-bid-now">₹${formatNum(a.currentBid)}</span>
            <span class="reserve-tag ${a.currentBid >= a.reserve ? 'met' : 'below'}">${a.currentBid >= a.reserve ? 'reserve met' : 'below reserve'}</span>
            <span class="auction-timer ${left < 60000 && !closed ? 'final' : ''}" data-timer="${a.id}">
              <i class="ph ph-timer" aria-hidden="true"></i> ${closed ? 'Bidding closed' : fmtTimeLeft(left)}
            </span>
          </span>
        </span>
      </button>`;
  }).join('');

  list.querySelectorAll('[data-auction]').forEach((el) => {
    el.addEventListener('click', () => selectAuction(el.dataset.auction));
  });

  if (!state.auction.selectedId && state.auction.items.length) selectAuction(state.auction.items[0].id);
}

function selectAuction(id) {
  state.auction.selectedId = id;
  renderAuctionList();
  renderAuctionPanel(true);
}

function renderAuctionPanel(scroll) {
  const panel = $('auction-bid-panel');
  const a = state.auction.items.find((x) => x.id === state.auction.selectedId);
  if (!a) { panel.hidden = true; return; }
  panel.hidden = false;

  const now = Date.now();
  const left = a.endsAt - now;
  const closed = left <= 0;

  $('auction-selected-img').src = a.img;
  $('auction-selected-title').textContent = a.title;
  $('auction-selected-meta').textContent = `${a.artForm} · ${a.lineage}`;
  $('auction-current-bid').textContent = `₹${formatNum(a.currentBid)}`;
  const tag = $('auction-reserve-tag');
  tag.textContent = a.currentBid >= a.reserve ? 'Reserve met' : 'Below reserve';
  tag.className = `reserve-tag ${a.currentBid >= a.reserve ? 'met' : 'below'}`;

  const timer = $('auction-selected-timer');
  timer.textContent = closed ? 'BIDDING CLOSED' : fmtTimeLeft(left);
  timer.classList.toggle('final', left < 60000 && !closed);

  $('auction-min-bid').textContent = `₹${formatNum(a.currentBid + 500)}`;
  const input = $('auction-bid-input');
  input.disabled = closed;
  input.placeholder = closed ? 'Auction closed' : '';
  $('btn-place-bid').disabled = closed;

  const history = $('auction-bid-history');
  history.innerHTML = a.bids.slice(0, 8).map((b) => `
    <li class="${b.bidder === 'You (Marcus)' ? 'you' : ''}">
      <span>${esc(b.bidder)} · ${new Date(b.t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      <b>₹${formatNum(b.amount)}</b>
    </li>`).join('') || '<li><span>No bids yet — be the first.</span></li>';

  if (scroll) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function placeBid() {
  const a = state.auction.items.find((x) => x.id === state.auction.selectedId);
  if (!a) return;
  const now = Date.now();
  if (a.endsAt <= now) { showToast('This auction has closed.', 'error'); return; }

  const input = $('auction-bid-input');
  const amount = Math.round(Number(input.value));
  if (!amount || amount < a.currentBid + 500) {
    showToast(`Minimum bid is ₹${formatNum(a.currentBid + 500)}.`, 'error');
    return;
  }

  a.currentBid = amount;
  a.bids.unshift({ bidder: 'You (Marcus)', amount, t: now });
  input.value = '';

  // Anti-sniping (FR 2.3.3): a bid in the final minute extends the timer by 2 minutes.
  if (a.endsAt - now < 60000) {
    a.endsAt += 120000;
    showToast('Anti-sniping: a bid landed in the final minute — timer extended by 2 minutes.', 'info');
  } else {
    showToast(`Bid placed: ₹${formatNum(amount)} — verified via Auth0 identity.`, 'success');
  }
  renderAuctionList();
  renderAuctionPanel(false);
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------
function bindWizardControls() {
  $('btn-start-add-product').addEventListener('click', startAddProduct);
  $('btn-cancel-wizard').addEventListener('click', closeWizard);
  $('btn-cancel-wizard-2').addEventListener('click', closeWizard);

  document.querySelectorAll('[data-goto-step]').forEach((btn) => {
    btn.addEventListener('click', () => goToWizardStep(Number(btn.dataset.gotoStep)));
  });
  document.querySelectorAll('.step[data-step]').forEach((dot) => {
    dot.addEventListener('click', () => {
      const target = Number(dot.dataset.step);
      if (target < state.currentWizardStep) goToWizardStep(target);
    });
  });

  $('btn-generate-story').addEventListener('click', generateStory);

  ['material', 'labor', 'transport'].forEach((key) => {
    $(`cost-${key}`).addEventListener('input', (e) => {
      state.currentCosts[key] = Number(e.target.value) || 0;
      calculatePricing();
    });
  });

  const margin = $('margin-range');
  margin.addEventListener('input', () => {
    state.currentCosts.margin = Number(margin.value);
    $('margin-value').textContent = `${margin.value}%`;
    margin.style.setProperty('--fill', `${((margin.value - 10) / 50) * 100}%`);
    calculatePricing();
  });

  $('btn-publish-final').addEventListener('click', publishProductNow);
}

function startAddProduct() {
  document.querySelectorAll('.view').forEach((v) => {
    const active = v.id === 'wizard-view';
    v.hidden = !active;
    v.classList.toggle('active', active);
  });
  goToWizardStep(1);
}

function closeWizard() {
  const wizard = $('wizard-view');
  if (!wizard) return;
  wizard.hidden = true;
  wizard.classList.remove('active');
}

function goToWizardStep(stepNum) {
  state.currentWizardStep = stepNum;

  document.querySelectorAll('#wizard-stepper .step').forEach((dot) => {
    const n = Number(dot.dataset.step);
    dot.classList.toggle('is-active', n === stepNum);
    dot.classList.toggle('is-done', n < stepNum);
  });
  document.querySelectorAll('[data-step-panel]').forEach((panel) => {
    panel.hidden = Number(panel.id.split('-').pop()) !== stepNum;
  });

  if (stepNum === 1) { updateBeforeAfterImages(); runPipelineStrip(); }
  if (stepNum === 3) triggerAiCatalogGeneration();
  if (stepNum === 4) { syncCostInputs(); calculatePricing(); }
  if (stepNum === 5) buildListingPreview();

  const screen = document.querySelector('.main-screen');
  if (screen) screen.scrollTop = 0;
}

// --- Step 1: photo & Shilpika Visual AI pipeline ---
function renderPresetThumbs() {
  const container = $('preset-thumbs-container');
  container.innerHTML = SAMPLE_CRAFT_PRESETS.map((p) => {
    const selected = p.id === state.selectedPreset.id;
    return `
    <button class="preset-thumb ${selected ? 'selected' : ''}" type="button"
            role="radio" aria-checked="${selected}" aria-label="${esc(p.name)}"
            data-preset="${p.id}">
      <img src="${p.afterImg}" alt="" loading="lazy">
      ${selected ? '<i class="ph-fill ph-check-circle preset-check" aria-hidden="true"></i>' : ''}
    </button>`;
  }).join('');

  container.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => selectCraftPreset(btn.dataset.preset));
  });
}

function selectCraftPreset(presetId) {
  const found = SAMPLE_CRAFT_PRESETS.find((p) => p.id === presetId);
  if (!found) return;
  state.selectedPreset = found;
  state.currentTranscript = found.speechHindi;
  state.currentCosts.material = found.materialCost;
  state.currentCosts.labor = found.laborCost;
  state.currentCosts.transport = found.transportCost;

  $('cost-material').value = found.materialCost;
  $('cost-labor').value = found.laborCost;
  $('cost-transport').value = found.transportCost;

  renderPresetThumbs();
  updateBeforeAfterImages();
  runPipelineStrip();
  $('transcript-preview').textContent = found.speechHindi;
  calculatePricing();
}

function updateBeforeAfterImages() {
  $('before-img').src = state.selectedPreset.beforeImg;
  $('after-img').src = state.selectedPreset.afterImg;
  syncAfterImageWidth();
}

function syncAfterImageWidth() {
  const box = $('before-after-box');
  if (box) $('after-img').style.width = `${box.offsetWidth}px`;
}

window.addEventListener('resize', syncAfterImageWidth);

// Pipeline strip (PRD §5.2): animate the stages for the selected photo.
let pipelineRunToken = 0;
async function runPipelineStrip() {
  const token = ++pipelineRunToken;
  const stages = {
    upload: document.querySelector('[data-stage="upload"]'),
    gate: document.querySelector('[data-stage="gate"]'),
    fix: document.querySelector('[data-stage="fix"]'),
    fidelity: document.querySelector('[data-stage="fidelity"]'),
    approve: document.querySelector('[data-stage="approve"]'),
  };
  const note = $('pipeline-note');
  Object.values(stages).forEach((el) => el.classList.remove('done', 'active-run', 'warn'));
  note.textContent = 'Running the local quality gate…';

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(250); if (token !== pipelineRunToken) return;
  stages.upload.classList.add('done');

  stages.gate.classList.add('active-run');
  await wait(700); if (token !== pipelineRunToken) return;
  // Demo photos are deliberately imperfect raw workshop shots → gate fails.
  stages.gate.classList.remove('active-run');
  stages.gate.classList.add('warn');

  stages.fix.classList.add('active-run');
  note.textContent = 'Gate FAILED (dark, cluttered, soft focus) → Gemini generative enhancement scheduled. A passing photo would skip AI entirely and cost nothing.';
  await wait(900); if (token !== pipelineRunToken) return;
  stages.fix.classList.remove('active-run');
  stages.fix.classList.add('done');

  stages.fidelity.classList.add('active-run');
  await wait(700); if (token !== pipelineRunToken) return;
  stages.fidelity.classList.remove('active-run');
  stages.fidelity.classList.add('done');

  stages.approve.classList.add('done');
  note.textContent = 'Fidelity check PASSED (colour drift within tolerance). Nothing publishes until you approve the result below.';
}

function bindBeforeAfterSlider() {
  const range = $('ba-range');
  const apply = (val) => {
    const pct = Math.min(100, Math.max(0, Number(val)));
    $('after-img-wrapper').style.width = `${pct}%`;
    $('slider-handle').style.left = `${pct}%`;
  };
  range.addEventListener('input', () => apply(range.value));
  apply(range.value);
}

// --- Step 2: voice (Vani) ---
function bindVoiceControls() {
  $('mic-record-btn').addEventListener('click', toggleVoiceRecording);
  document.querySelectorAll('[data-voice-sample]').forEach((chip) => {
    chip.addEventListener('click', () => useVoiceSample(chip.dataset.voiceSample));
  });
}

function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  state.speechRecognition = new SR();
  state.speechRecognition.continuous = false;
  state.speechRecognition.interimResults = true;
  state.speechRecognition.lang = 'hi-IN';

  state.speechRecognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) state.currentTranscript = event.results[i][0].transcript;
      else interim += event.results[i][0].transcript;
    }
    $('transcript-preview').textContent = state.currentTranscript || interim;
  };

  state.speechRecognition.onend = () => stopRecordingUi('Speech captured! Tap Next when ready.');
}

function toggleVoiceRecording() {
  const micBtn = $('mic-record-btn');
  if (!state.isRecording) {
    state.isRecording = true;
    micBtn.classList.add('recording');
    micBtn.setAttribute('aria-pressed', 'true');
    $('mic-stage').classList.add('recording');
    $('mic-status-text').textContent = 'Listening… speak naturally';
    startRecTimer();

    if (state.speechRecognition) {
      try { state.speechRecognition.start(); } catch { simulateVoiceInput(); }
    } else {
      simulateVoiceInput();
    }
  } else {
    stopRecordingUi('Recording stopped. Tap Next when ready.');
    if (state.speechRecognition) { try { state.speechRecognition.stop(); } catch { /* noop */ } }
  }
}

function startRecTimer() {
  state.recSeconds = 0;
  const timer = $('rec-timer');
  timer.hidden = false;
  timer.textContent = '00:00';
  state.recTimerInterval = setInterval(() => {
    state.recSeconds += 1;
    timer.textContent = `${String(Math.floor(state.recSeconds / 60)).padStart(2, '0')}:${String(state.recSeconds % 60).padStart(2, '0')}`;
  }, 1000);
}

function stopRecordingUi(message) {
  state.isRecording = false;
  clearInterval(state.recTimerInterval);
  $('mic-record-btn').classList.remove('recording');
  $('mic-record-btn').setAttribute('aria-pressed', 'false');
  $('mic-stage').classList.remove('recording');
  $('mic-status-text').textContent = message || 'Tap the microphone and speak';
  setTimeout(() => { $('rec-timer').hidden = true; }, 1600);
}

function simulateVoiceInput() {
  setTimeout(() => {
    state.currentTranscript = state.selectedPreset.speechHindi;
    $('transcript-preview').textContent = state.currentTranscript;
    stopRecordingUi('Speech captured! Tap Next when ready.');
    speakAloud('आपका विवरण रिकॉर्ड हो गया है।');
  }, 2500);
}

function useVoiceSample(lang) {
  state.currentTranscript = lang === 'hi' ? state.selectedPreset.speechHindi : state.selectedPreset.speechEnglish;
  $('transcript-preview').textContent = state.currentTranscript;
  showToast('Sample voice story loaded', 'info');
}

// --- Step 3: catalog + story engine + provenance ---
async function triggerAiCatalogGeneration() {
  const status = $('ai-gen-status');
  status.className = 'gen-status';
  status.innerHTML = '<i class="ph ph-spinner ph-spin" aria-hidden="true"></i> Gemini is extracting craft attributes and writing your bilingual listing…';

  try {
    const res = await fetch(`${API_BASE}/ai/catalog-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
      body: JSON.stringify({ transcript: state.currentTranscript || state.selectedPreset.speechHindi, language: 'hi' }),
    });
    state.currentCatalog = res.ok ? await res.json() : fallbackCatalog();
  } catch {
    state.currentCatalog = fallbackCatalog();
  }

  populateCatalogForm();
  status.className = 'gen-status ok';
  status.innerHTML = '<i class="ph-fill ph-check-circle" aria-hidden="true"></i> Catalog ready — review and edit anything below.';
}

function fallbackCatalog() {
  const p = state.selectedPreset;
  return {
    title: p.name,
    titleHindi: p.titleHindi,
    description: p.speechEnglish,
    descriptionHindi: p.speechHindi,
    category: p.category,
    craft: p.craft,
    origin: p.region,
    lineage: p.lineage,
    generations: p.generations,
    hours: p.hours,
    story: p.story,
    tags: ['handmade', 'artisan', 'heritage', p.craft.toLowerCase()],
  };
}

function populateCatalogForm() {
  const c = state.currentCatalog;
  const p = state.selectedPreset;
  $('cat-title-en').value = c.title || '';
  $('cat-title-hi').value = c.titleHindi || '';
  $('cat-desc-en').value = c.description || '';
  $('cat-desc-hi').value = c.descriptionHindi || '';
  $('cat-story').value = c.story || p.story;
  $('cat-category').value = c.category || p.category;
  $('cat-craft').value = c.craft || p.craft;
  $('cat-origin').value = c.origin || p.region;
  $('cat-lineage').value = c.lineage || p.lineage;
  $('cat-generations').value = c.generations || p.generations;
  $('cat-hours').value = c.hours ?? p.hours;

  const tags = Array.isArray(c.tags) ? c.tags : ['handmade', 'artisan', 'heritage'];
  $('cat-tags-container').innerHTML = tags.map((t) => `<span class="tag-pill">#${esc(t)}</span>`).join('');
}

function generateStory() {
  const p = state.selectedPreset;
  const box = $('cat-story');
  box.value = 'Reading the photo with Gemini Vision — identifying the art form…';
  box.disabled = true;
  setTimeout(() => {
    box.value = p.story;
    box.disabled = false;
    $('cat-craft').value = p.craft;
    showToast(`Art form identified: ${p.artForm} (Gemini Vision, demo mode)`, 'success');
  }, 1200);
}

function bindCatalogTabs() {
  document.querySelectorAll('[data-lang-tab]').forEach((tab) => {
    tab.addEventListener('click', () => switchCatalogTab(tab.dataset.langTab));
  });
}

function switchCatalogTab(lang) {
  document.querySelectorAll('[data-lang-tab]').forEach((t) => {
    const active = t.dataset.langTab === lang;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active);
  });
  $('tab-content-en').hidden = lang !== 'en';
  $('tab-content-hi').hidden = lang !== 'hi';
}

// --- Step 4: Shilpika Value (three-tier pricing) ---
function syncCostInputs() {
  if (document.activeElement && ['cost-material', 'cost-labor', 'cost-transport'].includes(document.activeElement.id)) return;
  $('cost-material').value = state.currentCosts.material;
  $('cost-labor').value = state.currentCosts.labor;
  $('cost-transport').value = state.currentCosts.transport;
}

function calculatePricing() {
  const { material, labor, transport, margin } = state.currentCosts;
  $('benchmark-region').textContent = state.selectedPreset.regionLabel;
  const totalCost = material + labor + transport;
  const floor = totalCost;
  const b2c = Math.round(totalCost * (1 + margin / 100));
  const b2b = Math.round(Math.max(b2c * 1.8, state.selectedPreset.marketMax));
  state.recommendedPrice = { floor, b2c, b2b };

  $('cost-total').textContent = `₹${formatNum(totalCost)}`;
  $('tier-floor').textContent = `₹${formatNum(floor)}`;
  $('tier-b2c').textContent = `₹${formatNum(b2c)}`;
  $('tier-b2b').textContent = `₹${formatNum(b2b)}`;
  $('recommended-price-range').textContent = `₹${formatNum(b2c)} (B2C anchor)`;
  $('cost-breakdown-text').textContent =
    `Floor = cost ₹${formatNum(totalCost)} · B2C = cost + ${margin}% fair margin · Export = B2C × 1.8, benchmarked against ₹${formatNum(state.selectedPreset.marketMin)}–₹${formatNum(state.selectedPreset.marketMax)} observed. Advisory only — you decide.`;

  const scaleMax = state.selectedPreset.marketMax * 1.25;
  const fillLeft = (state.selectedPreset.marketMin / scaleMax) * 100;
  const fillWidth = ((state.selectedPreset.marketMax - state.selectedPreset.marketMin) / scaleMax) * 100;
  const fill = $('benchmark-fill');
  fill.style.left = `${fillLeft}%`;
  fill.style.width = `${fillWidth}%`;

  const marker = $('benchmark-marker');
  const markerPos = Math.min(97, Math.max(3, (b2c / scaleMax) * 100));
  marker.style.left = `${markerPos}%`;
  marker.title = `Your B2C price ₹${b2c}`;
}

// --- Step 5: preview & publish ---
function buildListingPreview() {
  const p = state.selectedPreset;
  $('preview-img').src = p.afterImg;
  $('preview-title').textContent = $('cat-title-en').value || p.name;
  $('preview-title-hi').textContent = $('cat-title-hi').value || '';
  $('preview-desc').textContent = $('cat-desc-en').value || p.speechEnglish;
  $('preview-price').textContent = `₹${formatNum(state.recommendedPrice.b2c)} B2C · export ₹${formatNum(state.recommendedPrice.b2b)}`;
  $('preview-origin').innerHTML = `<i class="ph ph-map-pin" aria-hidden="true"></i> ${esc($('cat-origin').value || p.region)}`;

  const lineage = $('cat-lineage').value || p.lineage;
  const generations = $('cat-generations').value || p.generations;
  const hours = Number($('cat-hours').value) || p.hours;
  $('preview-provenance').innerHTML =
    `<i class="ph-fill ph-seal-check" aria-hidden="true"></i> Provenance: ${esc(lineage)} · ${esc(generations)} · ${formatNum(hours)} human hours`;

  const tags = Array.isArray(state.currentCatalog?.tags) ? state.currentCatalog.tags : ['handmade', 'artisan', 'heritage'];
  $('preview-tags').innerHTML = tags.map((t) => `<span class="tag-pill">#${esc(t)}</span>`).join('');
}

async function publishProductNow() {
  const btn = $('btn-publish-final');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner ph-spin" aria-hidden="true"></i> Publishing…';

  const p = state.selectedPreset;
  const payload = {
    title: $('cat-title-en').value || p.name,
    titleHindi: $('cat-title-hi').value || '',
    description: $('cat-desc-en').value || p.speechEnglish,
    story: $('cat-story').value || p.story,
    category: $('cat-category').value || p.category,
    craft: $('cat-craft').value || p.craft,
    origin: $('cat-origin').value || p.region,
    region: p.region,
    material: 'Handcrafted natural material',
    lineage: $('cat-lineage').value || p.lineage,
    generations: $('cat-generations').value || p.generations,
    laborHours: Number($('cat-hours').value) || p.hours,
    tags: ['handmade', 'artisan', ($('cat-craft').value || p.craft).toLowerCase()],
    priceMin: state.recommendedPrice.b2c,
    priceMax: state.recommendedPrice.b2c,
    priceB2b: state.recommendedPrice.b2b,
    thumbnailUrl: p.afterImg,
  };

  let published = false;
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const product = await res.json();
      await fetch(`${API_BASE}/products/${product.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.authToken || ''}` },
      });
      published = true;
    }
  } catch { /* demo mode */ }

  btn.disabled = false;
  btn.innerHTML = '<i class="ph-fill ph-rocket-launch" aria-hidden="true"></i> Publish to marketplace <span class="hindi-text">अभी प्रकाशित करें</span>';

  showToast(published
    ? `🎉 "${payload.title}" is live with its provenance card!`
    : `🎉 "${payload.title}" published in demo mode!`, 'success');
  speakAloud('बधाई हो! आपका उत्पाद बाज़ार में प्रकाशित हो गया है।');

  state.feedLoaded = false;
  await loadMarketplaceFeed();
  await loadArtisanDashboard();
  switchRole('artisan');
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
async function renderAdminView() {
  const setStats = (artisans, products, inquiries, avgPrice, provenance) => {
    $('admin-total-artisans').textContent = formatNum(artisans);
    $('admin-total-products').textContent = formatNum(products);
    $('admin-total-inquiries').textContent = formatNum(inquiries);
    $('admin-avg-price').textContent = `₹${formatNum(avgPrice)}`;
    $('admin-provenance').textContent = provenance;
  };

  let filled = false;
  try {
    const res = await fetch(`${API_BASE}/analytics/admin`, {
      headers: { Authorization: `Bearer ${state.authToken || ''}` },
    });
    if (res.ok) {
      const data = await res.json();
      setStats(data.totalArtisans || 5, data.totalProducts || 15, data.totalInquiries || 8,
        Math.round(data.averagePrice || 1450), '100%');
      filled = true;
    }
  } catch { /* fall through to feed-derived stats */ }

  if (!state.feedLoaded) await loadMarketplaceFeed();

  if (!filled) {
    const products = state.marketplaceProducts;
    const avg = products.length
      ? Math.round(products.reduce((s, p) => s + ((p.priceMin || 0) + (p.priceMax || 0)) / 2, 0) / products.length)
      : 0;
    setStats(5, products.length, products.reduce((s, p) => s + (p.inquiryCount || 0), 0), avg, '100%');
  }

  const counts = {};
  state.marketplaceProducts.forEach((p) => {
    const cat = p.category || 'Other';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  const max = Math.max(1, ...Object.values(counts));
  $('admin-category-bars').innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cat, n]) => `
    <div class="cat-bar-row">
      <span>${esc(cat)}</span>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width: ${(n / max) * 100}%"></div></div>
      <span class="cat-bar-num">${n}</span>
    </div>`).join('') || '<p class="muted small">No listings yet.</p>';

  document.querySelectorAll('.svc-dot').forEach((dot) => {
    const svc = dot.dataset.svc;
    if (svc === 'gate') { dot.className = 'svc-dot ok'; dot.textContent = 'always on'; return; }
    dot.className = `svc-dot ${state.apiOnline ? 'ok' : 'err'}`;
    dot.textContent = state.apiOnline ? 'online' : 'demo mode';
  });
}

// ---------------------------------------------------------------------------
// View mode toggle (mobile app preview)
// ---------------------------------------------------------------------------
window.toggleViewMode = function () {
  const container = $('app-main-container');
  const btn = $('view-mode-toggle-btn');
  const toMobile = container.classList.contains('desktop-mode');
  container.classList.toggle('mobile-mode', toMobile);
  container.classList.toggle('desktop-mode', !toMobile);
  btn.setAttribute('aria-pressed', toMobile);
  btn.innerHTML = toMobile
    ? '<i class="ph ph-desktop" aria-hidden="true"></i> <span>Desktop view</span>'
    : '<i class="ph ph-device-mobile" aria-hidden="true"></i> <span>Mobile view</span>';
  syncAfterImageWidth();
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function sampleImageFor(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('textile')) return SAMPLE_CRAFT_PRESETS[1].afterImg;
  if (cat.includes('clothing')) return SAMPLE_CRAFT_PRESETS[2].afterImg;
  if (cat.includes('metal') || cat.includes('decor')) return SAMPLE_CRAFT_PRESETS[3].afterImg;
  return SAMPLE_CRAFT_PRESETS[0].afterImg;
}

function initials(name) {
  return (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}

function formatNum(n) {
  return new Intl.NumberFormat('en-IN').format(n ?? 0);
}

function speakAloud(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'hi-IN';
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function showToast(message, type = 'info') {
  const container = $('toast-container');
  if (!container) return;
  const icons = { success: 'ph-fill ph-check-circle', info: 'ph-fill ph-info', error: 'ph-fill ph-warning-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="${icons[type] || icons.info}" aria-hidden="true"></i><span>${esc(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 260);
  }, 3800);
}

// ---------------------------------------------------------------------------
// SHILPIKA MARKET — routed curated catalog
// Routes: /market · /market/:category · /market/:category/:subcategory
//         /market/product/:sku
// Deep links resolve via the server-side SPA fallback; navigation here uses
// pushState so back/forward and shared links behave like real pages.
// Cart lives in localStorage; orders are created server-side via /api/v1/orders
// with prices always resolved from product data (never trusted from the client).
// ---------------------------------------------------------------------------
'use strict';

const CART_KEY = 'shilpika_cart_v1';
const marketState = {
  productsBySku: {},   // cached product detail per page render
  route: null,
  recording: null,
  lastEnquiry: null,
};

// ── Router ──────────────────────────────────────────────────────────────────
function isMarketPath(p) {
  return p === '/market' || p.startsWith('/market/');
}

function parseMarketRoute(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'market') return null;
  if (parts.length === 1) return { name: 'landing' };
  if (parts[1] === 'product' && parts[2]) return { name: 'product', sku: decodeURIComponent(parts[2]) };
  if (parts.length === 2) return { name: 'category', category: decodeURIComponent(parts[1]) };
  if (parts.length === 3) return { name: 'subcategory', category: decodeURIComponent(parts[1]), subcategory: decodeURIComponent(parts[2]) };
  return { name: 'landing' };
}

function marketRouteUrl(route) {
  if (route.name === 'product') return `/market/product/${encodeURIComponent(route.sku)}`;
  if (route.name === 'category') return `/market/${encodeURIComponent(route.category)}`;
  if (route.name === 'subcategory') return `/market/${encodeURIComponent(route.category)}/${encodeURIComponent(route.subcategory)}`;
  return '/market';
}

function navigateMarket(path) {
  history.pushState({}, '', path);
  if (state.currentView === 'marketplace-view') {
    renderMarketRoute(path);
  } else {
    showView('marketplace-view'); // its view hook renders the new route
  }
}

function renderMarketRoute(path = window.location.pathname) {
  const root = $('market-root');
  if (!root) return;
  const route = parseMarketRoute(path) || { name: 'landing' };
  const url = marketRouteUrl(route);
  if (window.location.pathname !== url) history.replaceState({}, '', url);
  marketState.route = route;
  window.scrollTo(0, 0);

  if (route.name === 'product') renderMarketProductPage(route.sku);
  else if (route.name === 'subcategory') renderMarketSubcategoryPage(route.subcategory);
  else if (route.name === 'category') renderMarketCategoryPage(route.category);
  else renderMarketLanding();
}

window.addEventListener('popstate', () => {
  if (isMarketPath(window.location.pathname) && state.currentView === 'marketplace-view') {
    renderMarketRoute();
  }
});

// Intercept SPA-internal links (<a data-market-link href="/market/...">) so
// plain anchors keep working for middle-click/new-tab while routing in-app.
function bindMarketNav(scope) {
  scope.querySelectorAll('a[data-market-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigateMarket(a.getAttribute('href'));
    });
  });
}

// ── Data helpers ────────────────────────────────────────────────────────────
async function marketFetch(path) {
  const res = await fetch(`${API_BASE}/market${path}`);
  if (!res.ok) {
    const err = new Error(res.status === 404 ? 'not_found' : 'request_failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function marketImgPlaceholder(text) {
  return `<div class="market-img-placeholder"><i class="ph ph-images" aria-hidden="true"></i><span>${esc(text || t('market_image_placeholder'))}</span></div>`;
}

function marketStateBlock(icon, title, body, actionsHtml) {
  return `
    <div class="market-state">
      <i class="ph ${icon}" aria-hidden="true"></i>
      <h3>${esc(title)}</h3>
      <p>${esc(body)}</p>
      ${actionsHtml || ''}
    </div>`;
}

function marketSkeleton(kind) {
  if (kind === 'detail') {
    return `<div class="market-detail-skeleton">
      <div class="skeleton" style="aspect-ratio:4/3"><div class="skeleton-thumb" style="height:100%"></div></div>
      <div class="skeleton"><div class="skeleton-line w40"></div><div class="skeleton-line w60"></div><div class="skeleton-line w80"></div></div>
    </div>`;
  }
  return Array.from({ length: 3 }, () => `
    <div class="skeleton" aria-hidden="true">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-body"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div>
    </div>`).join('');
}

function shortDesc(text, max = 120) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

// Render owner copy as real paragraphs (blank-line separated in the seed file).
function marketParagraphs(text) {
  if (!text) return '';
  return String(text)
    .split(/\n\s*\n/)
    .map((para) => `<p>${esc(para.replace(/\n/g, ' ').trim())}</p>`)
    .join('');
}

function parseYouTubeId(url) {
  if (!url) return null;
  const str = String(url).trim();
  const m = str.match(/(?:youtube\.com\/(?:watch\?.*?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,20})/);
  if (m) return m[1];
  if (/^[\w-]{6,20}$/.test(str)) return str; // bare video id
  return null;
}

function marketVideoEmbed(youtubeUrl, name) {
  const id = parseYouTubeId(youtubeUrl);
  if (!id) {
    return `
      <div class="market-video-empty" role="note">
        <i class="ph ph-film-strip" aria-hidden="true"></i>
        <p><strong>${esc(t('market_video_pending'))}</strong></p>
        <p class="muted small">${esc(t('market_video_pending_hint'))}</p>
      </div>`;
  }
  return `
    <div class="market-video-frame">
      <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0"
        title="${esc(name)} — YouTube" loading="lazy" allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
    </div>`;
}

function marketPricesBlock(p) {
  const floor = p.floorPrice != null ? `₹${formatNum(p.floorPrice)}` : '—';
  const export_ = p.exportPrice != null ? `₹${formatNum(p.exportPrice)}` : '—';
  return `
    <div class="market-prices">
      <div class="price-block">
        <span class="price-label">${esc(t('floor_price'))}</span>
        <strong class="price-value">${floor}</strong>
        <span class="price-note">${esc(t('floor_price_note'))}</span>
      </div>
      <div class="price-block export">
        <span class="price-label">${esc(t('export_price'))}</span>
        <strong class="price-value">${export_}</strong>
        <span class="price-note">${esc(t('export_price_note'))}</span>
      </div>
    </div>`;
}

function marketProductCard(p, categorySlug) {
  marketState.productsBySku[p.sku] = p;
  const sub = productSubTitle({ titleHindi: p.nameHindi, titleBengali: p.nameBengali });
  const href = `/market/product/${encodeURIComponent(p.sku)}`;
  const media = p.imageUrl
    ? `<img class="market-card-img" src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy">`
    : marketImgPlaceholder();
  return `
    <article class="market-product-card">
      <a class="market-card-media" href="${href}" data-market-link aria-label="${esc(p.name)}">${media}</a>
      <div class="market-card-body">
        <div class="market-card-toprow">
          <span class="market-sku-chip">${esc(p.sku)}</span>
          ${p.stock != null && p.stock <= 0 ? `<span class="stock-tag out">${esc(t('out_of_stock'))}</span>` : ''}
        </div>
        <h4 class="market-card-title"><a href="${href}" data-market-link>${esc(p.name)}</a></h4>
        ${sub ? `<div class="product-hindi">${esc(sub)}</div>` : ''}
        <p class="market-card-desc">${esc(shortDesc(p.description))}</p>
        <div class="market-prices compact">
          <div class="price-block"><span class="price-label">${esc(t('floor_price'))}</span><strong class="price-value">₹${formatNum(p.floorPrice)}</strong></div>
          <div class="price-block export"><span class="price-label">${esc(t('export_price'))}</span><strong class="price-value">₹${formatNum(p.exportPrice)}</strong></div>
        </div>
        <div class="market-card-actions">
          <a class="btn-ghost sm" href="${href}" data-market-link>${esc(t('view_details'))}</a>
          <button class="btn-primary sm" type="button" data-add-sku="${esc(p.sku)}">
            <i class="ph-bold ph-shopping-cart-simple" aria-hidden="true"></i> ${esc(t('add_to_cart'))}
          </button>
        </div>
      </div>
    </article>`;
}

function marketBreadcrumb(items) {
  // items: [{label, href?}] — last item is the current page (no link)
  const trail = items.map((it, i) => i === items.length - 1
    ? `<span class="crumb current" aria-current="page">${esc(it.label)}</span>`
    : `<a href="${esc(it.href)}" data-market-link>${esc(it.label)}</a><i class="ph ph-caret-right" aria-hidden="true"></i>`
  ).join('');
  return `<nav class="market-crumbs" aria-label="Breadcrumb">${trail}</nav>`;
}

function setMarketBreadcrumb(label) {
  const el = $('breadcrumb-view');
  if (el) el.textContent = label;
}

// ── Page renderers ──────────────────────────────────────────────────────────
async function renderMarketLanding() {
  const root = $('market-root');
  setMarketBreadcrumb(t('market_title'));
  document.title = `${t('market_title')} | Shilpika`;
  root.innerHTML = `<div class="market-hero"><h2>${esc(t('market_title'))}</h2><p>${esc(t('market_intro'))}</p></div><div class="market-sub-grid">${marketSkeleton()}</div>`;

  let categories;
  try {
    categories = await marketFetch('/categories');
  } catch {
    root.innerHTML = marketStateBlock('ph-wifi-slash', t('market_load_error_title'), t('market_load_error'),
      `<a class="btn-ghost" href="/market" data-market-link>${esc(t('market_retry'))}</a>`);
    bindMarketNav(root);
    return;
  }
  if (!categories.length) {
    root.innerHTML = marketStateBlock('ph-storefront', t('market_title'), t('market_empty_hint'));
    return;
  }

  root.innerHTML = `
    <div class="market-hero">
      <h2>${esc(t('market_title'))}</h2>
      <p>${esc(t('market_intro'))}</p>
    </div>
    ${categories.map((c) => `
      <section class="market-category-block" aria-labelledby="mc-${esc(c.id)}">
        <div class="market-cat-head">
          <div>
            <h3 id="mc-${esc(c.id)}"><i class="ph ${c.slug === 'sculpture' ? 'ph-cube' : 'ph-t-shirt'}" aria-hidden="true"></i> ${esc(c.name)}</h3>
            <p class="muted">${esc(c.tagline || '')}</p>
          </div>
          <a class="link-btn" href="/market/${esc(c.slug)}" data-market-link>${esc(t('market_view_category'))} <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
        </div>
        ${c.imageUrl ? `<img class="market-cat-banner" src="${esc(c.imageUrl)}" alt="${esc(c.name)}" loading="lazy">` : ''}
        <div class="market-sub-grid">
          ${c.subcategories.map((s) => marketSubCard(s, c.slug)).join('')}
        </div>
      </section>`).join('')}
  `;
  bindMarketNav(root);
}

function marketSubCard(s, categorySlug) {
  const href = `/market/${encodeURIComponent(categorySlug)}/${encodeURIComponent(s.slug)}`;
  const media = s.imageUrl
    ? `<img class="market-card-img" src="${esc(s.imageUrl)}" alt="${esc(s.name)}" loading="lazy">`
    : marketImgPlaceholder();
  return `
    <a class="market-sub-card" href="${href}" data-market-link>
      <div class="market-card-media">${media}</div>
      <div class="market-card-body">
        <h4 class="market-card-title">${esc(s.name)}</h4>
        <p class="market-card-desc">${esc(shortDesc(s.description, 90))}</p>
        <span class="market-explore">${esc(t('market_explore'))} <i class="ph ph-arrow-right" aria-hidden="true"></i></span>
      </div>
    </a>`;
}

async function renderMarketCategoryPage(slug) {
  const root = $('market-root');
  setMarketBreadcrumb(slug);
  root.innerHTML = `<div class="market-sub-grid">${marketSkeleton()}</div>`;
  let data;
  try {
    data = await marketFetch(`/categories/${encodeURIComponent(slug)}`);
  } catch (err) {
    root.innerHTML = err.status === 404
      ? marketStateBlock('ph-map-triangle', t('market_not_found_title'), t('market_not_found_hint'),
          `<a class="btn-ghost" href="/market" data-market-link>${esc(t('market_back'))}</a>`)
      : marketStateBlock('ph-wifi-slash', t('market_load_error_title'), t('market_load_error'),
          `<a class="btn-ghost" href="/market" data-market-link>${esc(t('market_retry'))}</a>`);
    bindMarketNav(root);
    return;
  }
  document.title = `${data.name} | Shilpika`;
  setMarketBreadcrumb(data.name);
  root.innerHTML = `
    ${marketBreadcrumb([{ label: t('market_title'), href: '/market' }, { label: data.name }])}
    <div class="market-hero small">
      <h2>${esc(data.name)}</h2>
      <p>${esc(data.description || data.tagline || '')}</p>
    </div>
    <div class="market-sub-grid">
      ${data.subcategories.map((s) => marketSubCard(s, data.slug)).join('')}
    </div>`;
  bindMarketNav(root);
}

async function renderMarketSubcategoryPage(slug) {
  const root = $('market-root');
  setMarketBreadcrumb(slug);
  root.innerHTML = `<div class="market-sub-grid">${marketSkeleton()}</div>`;

  let data;
  try {
    data = await marketFetch(`/subcategories/${encodeURIComponent(slug)}`);
  } catch (err) {
    root.innerHTML = err.status === 404
      ? marketStateBlock('ph-map-triangle', t('market_not_found_title'), t('market_not_found_hint'),
          `<a class="btn-ghost" href="/market" data-market-link>${esc(t('market_back'))}</a>`)
      : marketStateBlock('ph-wifi-slash', t('market_load_error_title'), t('market_load_error'),
          `<a class="btn-ghost" href="/market" data-market-link>${esc(t('market_retry'))}</a>`);
    bindMarketNav(root);
    return;
  }

  const { subcategory, category, products } = data;
  document.title = `${subcategory.name} | Shilpika`;
  setMarketBreadcrumb(subcategory.name);
  const catHref = category ? `/market/${encodeURIComponent(category.slug)}` : '/market';

  root.innerHTML = `
    ${marketBreadcrumb([{ label: t('market_title'), href: '/market' }, { label: category ? category.name : '', href: catHref }, { label: subcategory.name }])}
    <header class="market-sub-hero">
      <h2>${esc(subcategory.name)}</h2>
      <div class="market-sub-desc">${marketParagraphs(subcategory.description)}</div>
      ${subcategory.culturalInfo ? `
        <div class="market-cultural">
          <h4><i class="ph-fill ph-seal-check" aria-hidden="true"></i> ${esc(t('market_cultural_title'))}</h4>
          <div class="market-cultural-body">${marketParagraphs(subcategory.culturalInfo)}</div>
        </div>` : ''}
    </header>

    <section class="market-video-section" aria-label="${esc(subcategory.name)} video">
      ${marketVideoEmbed(subcategory.youtubeUrl, subcategory.name)}
    </section>

    <section aria-labelledby="market-products-h">
      <h3 id="market-products-h" class="market-products-h">${esc(t('market_available_products'))}</h3>
      ${products.length
        ? `<div class="market-product-grid">${products.map((p) => marketProductCard(p, category ? category.slug : '')).join('')}</div>`
        : marketStateBlock('ph-package', t('market_title'), t('market_empty_hint'))}
    </section>`;

  bindMarketNav(root);
  bindAddToCartButtons(root);
}

// ── Product detail page ─────────────────────────────────────────────────────
async function renderMarketProductPage(sku) {
  const root = $('market-root');
  setMarketBreadcrumb(sku);
  document.title = `${t('market_loading')} | Shilpika`;
  root.innerHTML = `<div class="market-detail-layout">${marketSkeleton('detail')}</div>`;

  let data;
  try {
    data = await marketFetch(`/products/${encodeURIComponent(sku)}`);
  } catch (err) {
    document.title = 'Shilpika';
    root.innerHTML = err.status === 404
      ? marketStateBlock('ph-package', t('market_product_not_found'), t('market_product_not_found_hint'),
          `<a class="btn-ghost" href="/market" data-market-link>${esc(t('market_back'))}</a>`)
      : marketStateBlock('ph-wifi-slash', t('market_load_error_title'), t('market_load_error'),
          `<a class="btn-ghost" href="/market" data-market-link>${esc(t('market_retry'))}</a>`);
    bindMarketNav(root);
    return;
  }

  const p = data.product;
  marketState.productsBySku[p.sku] = p;
  document.title = `${p.name} | Shilpika`;
  setMarketDescriptionMeta(p);
  setMarketBreadcrumb(p.name);

  const sub = productSubTitle({ titleHindi: p.nameHindi, titleBengali: p.nameBengali });
  const outOfStock = p.stock != null && p.stock <= 0;
  const media = p.imageUrl
    ? `<img class="market-detail-img" src="${esc(p.imageUrl)}" alt="${esc(p.name)}">`
    : marketImgPlaceholder();
  const maxQty = p.stock != null ? Math.max(1, Math.min(p.stock, 99)) : 99;

  root.innerHTML = `
    ${marketBreadcrumb([
      { label: t('market_title'), href: '/market' },
      { label: data.category ? data.category.name : '', href: data.category ? `/market/${encodeURIComponent(data.category.slug)}` : '/market' },
      { label: data.subcategory ? data.subcategory.name : '', href: data.subcategory && data.category ? `/market/${encodeURIComponent(data.category.slug)}/${encodeURIComponent(data.subcategory.slug)}` : '/market' },
      { label: p.name },
    ])}
    <article class="market-detail-layout">
      <div class="market-detail-media">${media}</div>
      <div class="market-detail-info">
        <div class="market-card-toprow">
          <span class="market-sku-chip" title="${esc(t('product_id_label'))}">${esc(p.sku)}</span>
          <span class="stock-tag ${outOfStock ? 'out' : 'in'}">${outOfStock ? esc(t('out_of_stock')) : esc(t('in_stock'))}</span>
        </div>
        <h2 class="market-detail-title">${esc(p.name)}</h2>
        ${sub ? `<div class="product-hindi lg">${esc(sub)}</div>` : ''}
        <div class="market-detail-meta">
          ${p.categoryName ? `<span class="meta-chip"><i class="ph ph-squares-four" aria-hidden="true"></i> ${esc(p.categoryName)}</span>` : ''}
          ${p.subcategoryName ? `<span class="meta-chip"><i class="ph ph-hand-heart" aria-hidden="true"></i> ${esc(p.subcategoryName)}</span>` : ''}
          ${p.origin ? `<span class="meta-chip"><i class="ph ph-map-pin" aria-hidden="true"></i> ${esc(p.origin)}</span>` : ''}
        </div>
        ${p.description ? `<p class="market-detail-desc">${esc(p.description)}</p>` : ''}

        <h4 class="market-prices-h">${esc(t('market_pricing_title'))}</h4>
        ${marketPricesBlock(p)}

        <div class="market-buy-box">
          <fieldset class="price-type-group">
            <legend class="field-label">${esc(t('price_type_label'))}</legend>
            <label class="price-type-option">
              <input type="radio" name="price-type" value="floor" checked>
              <span class="pt-name">${esc(t('floor_price'))}</span>
              <span class="pt-value">₹${formatNum(p.floorPrice)}</span>
            </label>
            <label class="price-type-option">
              <input type="radio" name="price-type" value="export" ${p.exportPrice == null ? 'disabled' : ''}>
              <span class="pt-name">${esc(t('export_price'))}</span>
              <span class="pt-value">${p.exportPrice != null ? `₹${formatNum(p.exportPrice)}` : '—'}</span>
            </label>
          </fieldset>
          <div class="qty-row">
            <label class="field-label" for="market-qty">${esc(t('quantity_label'))}</label>
            <div class="qty-stepper">
              <button type="button" id="qty-minus" aria-label="Decrease quantity"><i class="ph-bold ph-minus" aria-hidden="true"></i></button>
              <input type="number" id="market-qty" min="1" max="${maxQty}" value="1" inputmode="numeric" aria-live="polite">
              <button type="button" id="qty-plus" aria-label="Increase quantity"><i class="ph-bold ph-plus" aria-hidden="true"></i></button>
            </div>
            <span class="muted small" id="market-line-total" aria-live="polite"></span>
          </div>
          <div class="buy-actions">
            <button class="btn-primary" type="button" id="btn-detail-add" ${outOfStock ? 'disabled' : ''}>
              <i class="ph-bold ph-shopping-cart-simple" aria-hidden="true"></i> ${esc(t('add_to_cart'))}
            </button>
            <button class="btn-primary clay-deep" type="button" id="btn-detail-order" ${outOfStock ? 'disabled' : ''}>
              <i class="ph-fill ph-package" aria-hidden="true"></i> ${esc(t('place_order'))}
            </button>
            <button class="btn-ghost" type="button" id="btn-detail-share">
              <i class="ph-bold ph-share-network" aria-hidden="true"></i> ${esc(t('share_product'))}
            </button>
          </div>
          <p class="market-order-result" id="market-order-result" role="status" aria-live="polite" hidden></p>
        </div>

        <div class="market-enquiry">
          <h4><i class="ph-fill ph-microphone" aria-hidden="true"></i> ${esc(t('voice_enquiry'))}</h4>
          <p class="muted small">${esc(t('voice_enquiry_hint'))}</p>
          <div class="enquiry-controls">
            <button class="btn-ghost" type="button" id="btn-voice-enquiry">
              <i class="ph-fill ph-microphone" aria-hidden="true"></i> <span id="voice-btn-label">${esc(t('ask_by_voice'))}</span>
            </button>
            <div class="enquiry-text-row">
              <label class="sr-only" for="enquiry-text">${esc(t('enquiry_text_label'))}</label>
              <input type="text" id="enquiry-text" class="input" placeholder="${esc(t('enquiry_text_hint'))}" maxlength="300">
              <button class="btn-ghost sm" type="button" id="btn-enquiry-send">${esc(t('enquiry_send'))}</button>
            </div>
          </div>
          <p class="enquiry-status" id="enquiry-status" role="status" aria-live="polite"></p>
          <div class="enquiry-answer" id="enquiry-answer" hidden>
            <p class="enquiry-q" id="enquiry-q"></p>
            <p class="enquiry-a" id="enquiry-a"></p>
            <button class="chip-btn sm" type="button" id="btn-enquiry-replay"><i class="ph-fill ph-speaker-high" aria-hidden="true"></i> ${esc(t('enquiry_replay'))}</button>
          </div>
        </div>
      </div>
    </article>`;

  bindMarketNav(root);
  bindProductDetailControls(p, maxQty, outOfStock);
}

function setMarketDescriptionMeta(p) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = shortDesc(p.description || `${p.name} — handcrafted on Shilpika`, 155);
}

function selectedPriceType() {
  const checked = document.querySelector('input[name="price-type"]:checked');
  return checked ? checked.value : 'floor';
}

function detailQuantity() {
  const input = $('market-qty');
  const qty = Math.max(1, Math.min(parseInt(input && input.value, 10) || 1, parseInt(input && input.max, 10) || 99));
  if (input) input.value = qty;
  return qty;
}

function updateLineTotal(p) {
  const el = $('market-line-total');
  if (!el) return;
  const price = selectedPriceType() === 'floor' ? p.floorPrice : p.exportPrice;
  const qty = detailQuantity();
  el.textContent = price != null ? `${t('estimated_total')}: ₹${formatNum(price * qty)}` : '';
}

function bindProductDetailControls(p, maxQty, outOfStock) {
  const qtyInput = $('market-qty');
  const minus = $('qty-minus');
  const plus = $('qty-plus');

  minus?.addEventListener('click', () => { if (qtyInput) qtyInput.value = Math.max(1, detailQuantity() - 1); updateLineTotal(p); });
  plus?.addEventListener('click', () => { if (qtyInput) qtyInput.value = Math.min(maxQty, detailQuantity() + 1); updateLineTotal(p); });
  qtyInput?.addEventListener('change', () => updateLineTotal(p));
  document.querySelectorAll('input[name="price-type"]').forEach((r) =>
    r.addEventListener('change', () => updateLineTotal(p)));
  updateLineTotal(p);

  $('btn-detail-add')?.addEventListener('click', () => {
    addToCart(p, selectedPriceType(), detailQuantity());
  });

  $('btn-detail-order')?.addEventListener('click', async () => {
    const btn = $('btn-detail-order');
    btn.disabled = true;
    try {
      const result = await placeOrderItems([{ sku: p.sku, priceType: selectedPriceType(), quantity: detailQuantity() }]);
      const panel = $('market-order-result');
      panel.hidden = false;
      if (result.placed.length) {
        panel.className = 'market-order-result success';
        panel.innerHTML = `<strong>${esc(t('order_placed_title'))}</strong> ${result.placed.map((o) => `${esc(o.orderNumber)} — ₹${formatNum(o.totalAmount)}`).join(' · ')}`;
        showToast(t('order_placed_toast'), 'success');
      } else {
        panel.className = 'market-order-result error';
        panel.textContent = result.failed[0] ? result.failed[0].message : t('order_failed');
      }
    } finally {
      if (!outOfStock) btn.disabled = false;
    }
  });

  $('btn-detail-share')?.addEventListener('click', () => shareProduct(p));

  $('btn-voice-enquiry')?.addEventListener('click', () => toggleVoiceEnquiry(p.sku));
  $('btn-enquiry-send')?.addEventListener('click', () => {
    const input = $('enquiry-text');
    const q = (input.value || '').trim();
    if (!q) return;
    input.value = '';
    sendEnquiry(p.sku, { question: q });
  });
  $('enquiry-text')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-enquiry-send')?.click();
  });
  $('btn-enquiry-replay')?.addEventListener('click', () => replayEnquiryAudio());
}

// ── Sharing ─────────────────────────────────────────────────────────────────
async function shareProduct(p) {
  const url = `${window.location.origin}/market/product/${encodeURIComponent(p.sku)}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: `${p.name} | Shilpika`, text: shortDesc(p.description || p.name, 80), url });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user closed the share sheet
      // fall through to clipboard fallbacks
    }
  }
  copyToClipboard(url);
}

function copyToClipboard(text) {
  const done = () => showToast(t('market_link_copied'), 'success');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => legacyCopy(text, done));
  } else {
    legacyCopy(text, done);
  }
}

function legacyCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    showToast(t('copy_failed'), 'error');
  }
  ta.remove();
}

// ── Cart ────────────────────────────────────────────────────────────────────
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  renderCartBadge();
}

function cartUnitCount() {
  return loadCart().reduce((n, i) => n + i.quantity, 0);
}

function renderCartBadge() {
  const badge = $('cart-badge');
  if (!badge) return;
  const n = cartUnitCount();
  badge.hidden = n === 0;
  badge.textContent = n > 9 ? '9+' : String(n);
}

function addToCart(product, priceType, quantity) {
  const unitPrice = priceType === 'floor' ? product.floorPrice : product.exportPrice;
  if (unitPrice == null) { showToast(t('market_price_missing'), 'error'); return; }
  if (product.stock != null && product.stock <= 0) { showToast(t('out_of_stock'), 'error'); return; }

  const items = loadCart();
  const key = `${product.sku}::${priceType}`;
  const existing = items.find((i) => i.key === key);
  const newQty = (existing ? existing.quantity : 0) + quantity;
  if (product.stock != null && newQty > product.stock) { showToast(t('stock_limit'), 'error'); return; }

  if (existing) existing.quantity = newQty;
  else items.push({
    key,
    sku: product.sku,
    name: product.name,
    image: product.imageUrl || '',
    priceType,
    unitPrice,
    quantity,
  });
  saveCart(items);
  showToast(t('added_to_cart'), 'success');
}

function bindAddToCartButtons(scope) {
  scope.querySelectorAll('[data-add-sku]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = marketState.productsBySku[btn.dataset.addSku];
      if (product) addToCart(product, 'floor', 1);
    });
  });
}

function openCartDrawer() {
  renderCartDrawer();
  $('cart-drawer').hidden = false;
  $('cart-backdrop').hidden = false;
  $('cart-close-btn').focus();
}

function closeCartDrawer() {
  $('cart-drawer').hidden = true;
  $('cart-backdrop').hidden = true;
  $('cart-toggle-btn').focus();
}

function renderCartDrawer() {
  const wrap = $('cart-items');
  const foot = $('cart-foot');
  const resultPanel = $('cart-order-result');
  if (resultPanel) resultPanel.hidden = true;

  const items = loadCart();
  if (!items.length) {
    wrap.innerHTML = `
      <div class="cart-empty">
        <i class="ph ph-shopping-cart-simple" aria-hidden="true"></i>
        <p>${esc(t('cart_empty'))}</p>
        <a class="btn-ghost sm" href="/market" data-market-link onclick="closeCartDrawer()">${esc(t('market_back'))}</a>
      </div>`;
    foot.hidden = true;
    bindMarketNav(wrap);
    return;
  }

  wrap.innerHTML = items.map((i) => `
    <div class="cart-item" data-key="${esc(i.key)}">
      ${i.image
        ? `<img class="cart-item-img" src="${esc(i.image)}" alt="" loading="lazy">`
        : `<div class="cart-item-img placeholder"><i class="ph ph-image" aria-hidden="true"></i></div>`}
      <div class="cart-item-body">
        <span class="cart-item-name">${esc(i.name)}</span>
        <span class="cart-item-meta">${esc(i.sku)} · <span class="price-type-tag ${esc(i.priceType)}">${esc(i.priceType === 'floor' ? t('floor_price') : t('export_price'))}</span></span>
        <div class="cart-item-foot">
          <div class="qty-stepper mini">
            <button type="button" data-cart-dec="${esc(i.key)}" aria-label="Decrease quantity"><i class="ph-bold ph-minus" aria-hidden="true"></i></button>
            <span class="cart-qty">${i.quantity}</span>
            <button type="button" data-cart-inc="${esc(i.key)}" aria-label="Increase quantity"><i class="ph-bold ph-plus" aria-hidden="true"></i></button>
          </div>
          <strong>₹${formatNum(i.unitPrice * i.quantity)}</strong>
        </div>
      </div>
      <button class="cart-item-remove" type="button" data-cart-remove="${esc(i.key)}" aria-label="${esc(t('cart_remove'))}">
        <i class="ph ph-trash" aria-hidden="true"></i>
      </button>
    </div>`).join('');

  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  $('cart-total').textContent = `₹${formatNum(total)}`;
  foot.hidden = false;

  wrap.querySelectorAll('[data-cart-dec]').forEach((b) => b.addEventListener('click', () => changeCartQty(b.dataset.cartDec, -1)));
  wrap.querySelectorAll('[data-cart-inc]').forEach((b) => b.addEventListener('click', () => changeCartQty(b.dataset.cartInc, 1)));
  wrap.querySelectorAll('[data-cart-remove]').forEach((b) => b.addEventListener('click', () => {
    saveCart(loadCart().filter((i) => i.key !== b.dataset.cartRemove));
    renderCartDrawer();
  }));
}

function changeCartQty(key, delta) {
  const items = loadCart();
  const item = items.find((i) => i.key === key);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    saveCart(items.filter((i) => i.key !== key));
  } else {
    saveCart(items);
  }
  renderCartDrawer();
}

async function placeOrderItems(requests) {
  const placed = [];
  const failed = [];
  for (const req of requests) {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
        body: JSON.stringify({ productSku: req.sku, priceType: req.priceType, quantity: req.quantity }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && (data.message || data.error)) || t('order_failed'));
      placed.push(data);
    } catch (err) {
      failed.push({ request: req, message: err.message });
    }
  }
  return { placed, failed };
}

async function checkoutCart() {
  const items = loadCart();
  if (!items.length) return;
  if (!state.authToken) {
    showToast(t('signin_required'), 'error');
    openLoginOverlay();
    return;
  }
  const btn = $('cart-checkout-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner ph-spin" aria-hidden="true"></i>';
  try {
    const { placed, failed } = await placeOrderItems(items.map((i) => ({ sku: i.sku, priceType: i.priceType, quantity: i.quantity })));
    const remaining = failed.map((f) => items.find((i) => i.sku === f.request.sku && i.priceType === f.request.priceType)).filter(Boolean);
    saveCart(remaining);
    renderCartDrawer();

    const panel = $('cart-order-result');
    panel.hidden = false;
    if (placed.length) {
      panel.innerHTML = `<strong>${esc(t('order_placed_title'))}</strong><ul>${placed.map((o) =>
        `<li>${esc(o.orderNumber)} — ${esc(o.productName)} × ${o.quantity} — ₹${formatNum(o.totalAmount)}</li>`).join('')}</ul>`;
      showToast(t('order_placed_toast'), 'success');
    }
    if (failed.length) {
      panel.innerHTML += `<p class="error-line">${esc(t('cart_order_failed'))} ${esc(failed[0].message)}</p>`;
    }
    if (!placed.length && !failed.length) showToast(t('order_failed'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="ph-fill ph-package" aria-hidden="true"></i> ${esc(t('cart_place_order'))}`;
  }
}

function openLoginOverlay() {
  closeCartDrawer();
  $('login-overlay').hidden = false;
  $('app-main-container').style.visibility = 'hidden';
  $('signin-email')?.focus();
}

// ── Voice enquiry (MediaRecorder → backend → ElevenLabs TTS) ────────────────
function setEnquiryStatus(message, isError) {
  const el = $('enquiry-status');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('error', !!isError);
}

function updateVoiceBtn(recording) {
  const label = $('voice-btn-label');
  const btn = $('btn-voice-enquiry');
  if (label) label.textContent = recording ? t('stop_recording') : t('ask_by_voice');
  if (btn) btn.classList.toggle('recording', recording);
}

async function toggleVoiceEnquiry(sku) {
  if (marketState.recording) {
    marketState.recording.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    setEnquiryStatus(t('voice_unsupported'), true);
    return;
  }
  let stream;
  let recorder;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    setEnquiryStatus(err && err.name === 'NotAllowedError' ? t('voice_permission') : t('voice_error'), true);
    return;
  }
  try {
    recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      marketState.recording = null;
      updateVoiceBtn(false);
      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size < 1200) { setEnquiryStatus(t('voice_too_short'), true); return; }
      const dataUrl = await blobToBase64(blob);
      await sendEnquiry(sku, { audioBase64: dataUrl.split(',')[1], audioMimeType: mimeType });
    };
    recorder.start();
    marketState.recording = recorder;
    updateVoiceBtn(true);
    setEnquiryStatus(t('voice_listening'));
    // Safety cap so a forgotten recording cannot run forever.
    setTimeout(() => { if (marketState.recording === recorder) recorder.stop(); }, 8000);
  } catch {
    stream.getTracks().forEach((tr) => tr.stop());
    setEnquiryStatus(t('voice_error'), true);
  }
}

async function sendEnquiry(sku, body) {
  setEnquiryStatus(t('enquiry_thinking'));
  const answerWrap = $('enquiry-answer');
  if (answerWrap) answerWrap.hidden = true;
  try {
    const res = await fetch(`${API_BASE}/market/products/${encodeURIComponent(sku)}/enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, language: state.currentLang || 'en' }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.message) || 'enquiry_failed');
    marketState.lastEnquiry = data;
    const q = $('enquiry-q');
    const a = $('enquiry-a');
    if (q) q.textContent = `${t('enquiry_you_asked')} ${data.question || t('enquiry_voice_question')}`;
    if (a) a.textContent = data.answer;
    if (answerWrap) answerWrap.hidden = false;
    setEnquiryStatus('');
    playEnquiryAudio(data);
  } catch {
    setEnquiryStatus(t('enquiry_failed'), true);
  }
}

function playEnquiryAudio(data) {
  if (data.audioBase64) {
    const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
    audio.play().catch(() => {
      // Audio playback failed (autoplay policy/codec) — fall back to browser TTS.
      if (window.speechSynthesis) speakAloud(data.answer);
    });
    return;
  }
  // Server TTS unavailable (ElevenLabs not configured) — browser TTS fallback.
  if (window.speechSynthesis) speakAloud(data.answer);
}

function replayEnquiryAudio() {
  if (marketState.lastEnquiry) playEnquiryAudio(marketState.lastEnquiry);
}

// ── Boot ────────────────────────────────────────────────────────────────────
function bindCartControls() {
  $('cart-toggle-btn')?.addEventListener('click', openCartDrawer);
  $('cart-close-btn')?.addEventListener('click', closeCartDrawer);
  $('cart-backdrop')?.addEventListener('click', closeCartDrawer);
  $('cart-checkout-btn')?.addEventListener('click', checkoutCart);
  $('topbar-signin')?.addEventListener('click', openLoginOverlay);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('cart-drawer').hidden) closeCartDrawer();
  });
  renderCartBadge();
}

document.addEventListener('DOMContentLoaded', bindCartControls);

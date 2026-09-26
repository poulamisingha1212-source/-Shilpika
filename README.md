<div align="center">

# 🪔 Shilpika — Shilp for Shilpi

**Voice-first, AI-assisted marketplace & business manager for marginalized Indian artisans.**

*"Your digital business assistant — not another complicated e-commerce form."*

[![Live on Render](https://img.shields.io/badge/Live-shilpika--craft--marketplace.onrender.com-46E3B7?logo=render)](https://shilpika-craft-marketplace.onrender.com)
[![Backend](https://img.shields.io/badge/Backend-NestJS_10-E0234E?logo=nestjs)](https://nestjs.com/)
[![DB](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![AI](https://img.shields.io/badge/Vision-Gemini-4285F4?logo=google)](https://ai.google.dev/)
[![Voice](https://img.shields.io/badge/Voice-ElevenLabs-000000)](https://elevenlabs.io/)
[![Mail](https://img.shields.io/badge/Mail-Brevo-0B996E)](https://www.brevo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ What is Shilpika?

Shilpika is a **premium curated marketplace** for India's living craft traditions — Dhokra metal casting, Shola pith carving, Pattachitra sarees — built so an artisan can go from **a single photo and a spoken sentence** to a published, fairly-priced, verifiable listing, and a buyer can browse, enquire by **voice**, and order with **transparent floor & export pricing**.

Everything is trilingual-first (English · हिन्दी · বাংলা) and every price shown to a buyer is resolved **server-side from the database** — never trusted from the client.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend (SPA)** | Vanilla JavaScript (ES2022), semantic HTML5, hand-crafted CSS design system (*"Nature Distilled"* — warm cream & terracotta), Phosphor Icons |
| **Backend** | Node.js 24, **NestJS 10** (modular DI architecture), Express, Swagger/OpenAPI |
| **ORM / DB** | TypeORM + **PostgreSQL** (production) with a transparent **pg-mem** in-memory fallback for local dev & CI |
| **Auth** | Auth0 (Google OAuth via authorization-code flow) + **email/password with Brevo OTP verification**, JWT sessions (`@nestjs/jwt`) |
| **AI — Vision/Catalog** | **Google Gemini** (`@google/generative-ai`) — photo + voice transcript → structured trilingual catalog (EN/HI/BN) |
| **AI — Voice** | **ElevenLabs** — Scribe STT (product voice enquiries) + TTS voice replies; browser `speechSynthesis` fallback |
| **Email** | **Brevo (Sendinblue) v3 API** — transactional OTP mail |
| **Anti-exploitation pricing** | Cost-input + market-observation pricing engine (see [How the pricing is calculated](#-how-the-pricing-is-calculated)) |
| **Live auctions** | Nilaam — timed bidding with anti-sniping (final-minute extension) |
| **Analytics** | Platform impact metrics for admins (artisans, listings, inquiries, views, AI adoption) |
| **Hosting** | **Render** — Blueprint deploy (`render.yaml`), Node runtime, PostgreSQL |

---

## 🏛️ Architecture

```text
                        ┌─────────────────────────────────────────────┐
                        │            Render (Node runtime)            │
                        │                                             │
 Browser ── GET / … ──▶ │  express.static(backend/public)             │
   │  deep links        │  SPA fallback → index.html (/market/…)      │
   │                    │                                             │
   ├── /api/v1/* ─────▶ │  NestJS (Throttler ▸ Guards ▸ Controllers)  │
   │                    │   ├── auth        (Auth0 · JWT · OTP·Brevo) │
   │                    │   ├── market      (curated catalog)         │
   │                    │   ├── orders      (server-side pricing)     │
   │                    │   ├── products    (seller listings)         │
   │                    │   ├── ai          (Gemini · ElevenLabs)     │
   │                    │   ├── pricing     (fair-price engine)       │
   │                    │   ├── auctions · inquiries · analytics     │
   │                    │   └── marketplace/feed (health-checked)    │
   │                    │                                             │
   │                    │  TypeORM ▸ PostgreSQL (synchronize on boot) │
   └── static assets ◀─ │  /assets/market/* (owner product photos)    │
                        └─────────────────────────────────────────────┘
                              ▲                ▲              ▲
                        Gemini API       ElevenLabs API   Brevo API
                        (catalog AI)     (STT + TTS)      (OTP email)
```

**One service runs the whole site.** The SPA (`backend/public`) is served by the same NestJS process that exposes the API, so the deployed app needs no CORS and no second service. Deep links like `/market/product/DHOKRA-001` resolve through an SPA fallback that rewrites any non-`/api` GET to `index.html` — shared links survive refresh, new tabs, WhatsApp, and email.

---

## 🛍️ The Curated Market

```text
Market (/market)
├── Sculpture (/market/sculpture)
│   ├── Dhokra Art        (/market/sculpture/dhokra-art)
│   └── Shola Pith Art    (/market/sculpture/shola-pith-art)
└── Outfits (/market/outfits)
    └── Pattachitra Saree (/market/outfits/pattachitra-saree)
```

- **Structured, extensible model** — `MarketCategory` → `MarketSubcategory` → `Product`. Adding a craft = one object in [`backend/src/market/market-seed.ts`](backend/src/market/market-seed.ts); the catalog is **upserted on every boot** (config file = source of truth, no manual DB edits).
- **Subcategory pages** — craft story, cultural-provenance notes, an embedded **YouTube documentary** (per-craft, `youtube-nocookie`), and three featured products with owner-supplied photography.
- **Product pages** (`/market/product/:SKU`) — stable human-readable SKUs (`DHOKRA-001`, `SHOLA-002`, `PATTA-003`), large imagery, **Floor Price and Export Price shown separately, never merged**, live stock, quantity stepper, Add to Cart / Place Order, Web-Share-API sharing with clipboard fallback, and an **ElevenLabs voice enquiry** that answers strictly from live product data (it can quote the floor/export price, stock, and craft story — it cannot invent facts).
- **Cart & orders** — a localStorage cart drawer (grouped per SKU + price type) that checks out via `POST /api/v1/orders`. The backend re-reads the authoritative price, validates stock, decrements inventory, stamps an order number (`SHP-XXXXXXXX`), and stores the full record. Guests can browse and share; sign-in is requested only when ordering.

---

## 🧮 How the Pricing Is Calculated

Shilpika's core promise is a **fair, explainable price**. The engine in [`pricing.service.ts`](backend/src/pricing/pricing.service.ts) combines the artisan's real costs with market observations — and *tells you exactly which factors it used*.

### 1 · Cost base

```text
totalCost = materialCost + laborCost + otherCost
```

The artisan enters these from the listing wizard (the Anti-Exploitation Card also tracks generations of lineage and hours of work, shown to buyers as provenance).

### 2 · Cost-based range (with desired margin, default 30%)

```text
marginFraction = desiredMarginPercent / 100

costBasedMin = round( totalCost × (1 + marginFraction × 0.5) )   ← half-margin floor
costBasedMax = round( totalCost × (1 + marginFraction × 1.5) )   ← 1.5×-margin ceiling
```

### 3 · Blend with real market observations (when available)

If regional market observations exist for the craft/region, the cost range is clamped to the market — never below 80% of the observed minimum, never above 110% of the observed maximum:

```text
minPrice = round( max( costBasedMin,  market.min × 0.80 ) )
maxPrice = round( min( max( costBasedMax, market.avg × 1.20 ), market.max × 1.10 ) )
```

If **no** market data exists, the engine says so explicitly (`data_availability: COST_BASED`) and prices purely from costs — it **never fabricates market data**. Every recommendation returns a human-readable `factors[]` list (costs, margin, number of observations, market median/trend, data freshness) and is persisted for audit.

### 4 · Floor Price vs Export Price (buyer-facing)

Curated market products carry **two distinct prices** (e.g. Floor ₹2,500 / Export ₹4,500). They are stored as separate columns, displayed side-by-side, and an order records `priceType: "floor" | "export"` with the **unit price resolved from the database at order time**:

```text
order.totalAmount = authoritativeUnitPrice × quantity        (never client-supplied)
```

### 5 · Quick in-wizard estimate (client fallback when the API is offline)

```text
floor ≈ totalCost                     (or listedMin / 1.25 as a sanity floor)
B2C   ≈ (listedMin + listedMax) / 2
B2B   ≈ max( 1.8 × B2C, listedMax )
```

---

## 🔐 Authentication & Security

| Flow | What happens |
|---|---|
| **Continue with Google** | Auth0 authorization-code flow → backend exchanges code → provisions user (`emailVerified: true`, pre-verified) → JWT session. Zero friction, no OTP. |
| **Email + password (sign up)** | Account + Auth0 DB-connection registration + artisan profile (Aadhaar/region for seller KYC) created → **6-digit OTP emailed via Brevo** → user verifies → session issued. |
| **Email + password (sign in)** | Credentials checked against Auth0 (and local scrypt hash fallback) → **OTP emailed** → verify → session. |

**OTP hardening:** codes are stored as `sha256(email::code)` (never plaintext), expire after **10 minutes**, allow a maximum of **5 incorrect attempts**, are **single-use**, and resends are rate-limited to **one per 60 seconds** (plus the global throttler: 30 requests/min/IP). If `BREVO_API_KEY` is ever missing in production, sign-up/sign-in **degrade gracefully instead of bricking** (session issued without verification, loudly logged) — set the key to enable verification.

Other guarantees: order prices can't be manipulated (the server re-reads the DB), product IDs are validated server-side, `forbidNonWhitelisted` DTO validation, Helmet, and **no API key ever reaches the frontend** (Gemini, ElevenLabs and Brevo are called server-side only). Passwords are stored as salted **scrypt** hashes.

---

## 🌐 Multilingual & Accessible

- **English · हिन्दी · বাংলা** across the entire UI (including the market, cart and OTP screens), persisted per visitor.
- Product names show a **language-aware second line** — Bengali subtitle in বাংলা mode, Hindi in हिन्दी mode (AI-generated per listing alongside English).
- Semantic HTML, labelled controls, `aria-live` regions for dynamic results, visible focus rings, keyboard-navigable cards.

---

## 🚀 Getting Started

### Prerequisites
Node.js 20+ (24 recommended) · PostgreSQL (optional — falls back to in-memory pg-mem) · A Brevo API key for real OTP emails.

### 1 · Install & run

```bash
git clone https://github.com/poulamisingha1212-source/-Shilpika.git
cd Shilpika
npm run setup          # installs backend dependencies
npm run backend:dev    # starts the API + SPA on http://localhost:3000
```

Open **http://localhost:3000** — the SPA and API share one origin. Without a Postgres URL the app transparently seeds and runs on an in-memory PostgreSQL emulator.

### 2 · Environment variables (backend/.env)

```bash
cp .env.example backend/.env    # then fill in what you have
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | prod | PostgreSQL connection string (with `DATABASE_SSL=true` for hosted DBs) |
| `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` / `AUTH0_AUDIENCE` | for Google | Auth0 tenant + SPA credentials |
| `APP_BASE_URL` | prod | Public origin — used to build OAuth callback URLs |
| `JWT_SECRET` | yes | Session signing (auto-generated on Render) |
| `GEMINI_API_KEY` | for AI catalog | Google AI Studio key |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | for voice | ElevenLabs STT + TTS |
| `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | for OTP | Brevo transactional email |
| `DB_SYNCHRONIZE` | deploy | `true` → TypeORM creates/syncs schema on boot |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | optional | Rate limiting (defaults 60s / 30 req) |

### 3 · Deploy to Render

The repo ships a **Render Blueprint** (`render.yaml`): Node web service rooted at `backend/`, build `npm install --include=dev && npm run build`, start `node dist/src/main.js`, health check `GET /api/v1/marketplace/feed`. Secrets marked `sync: false` are entered once in the Render dashboard. Push to `main` → auto-deploy → on boot the app syncs the schema and upserts the market catalog.

---

## 🔌 API at a Glance

| Area | Endpoints |
|---|---|
| **Market** | `GET /api/v1/market/categories` · `/categories/:slug` · `/subcategories/:slug` · `/products/:sku` · `POST /products/:sku/enquiry` |
| **Auth** | `POST /auth/signup` → OTP · `POST /auth/login` → OTP · `POST /auth/verify-otp` · `POST /auth/resend-otp` · `GET /auth/google` → Auth0 · `GET /auth/me` |
| **Orders** | `POST /api/v1/orders` (auth; `productSku`, `priceType`, `quantity`) · `GET /api/v1/orders/mine` |
| **Products (seller)** | `POST/PATCH /api/v1/products` · `/publish` · `GET /marketplace/feed` |
| **AI** | `POST /api/v1/ai/catalog-generate` (Gemini) · voice transcription/synthesis |
| **Pricing** | `POST /api/v1/pricing/recommend` · accept/override · market trend |
| **More** | auctions · inquiries · analytics · Swagger UI at **/api/docs** |

---

## 🧪 Quality

```bash
npm run backend:build   # TypeScript build (the static gate)
npm run backend:test    # Jest suite — 115+ tests across pricing, auth, inquiries, security audit…
```

The security-audit suite covers auth bypass, price tampering and ownership guards; the pricing suite validates the fair-price math above. Seeded demo data (artisans, products, market observations) is clearly labelled `[DEMO]` wherever it is used.

---

## 📁 Repository Map

```text
Shilpika/
├── render.yaml                     # Render Blueprint (service + env contract)
├── backend/
│   ├── src/
│   │   ├── market/                 # curated catalog: entities, API, market-seed.ts (owner content)
│   │   ├── orders/                 # cart-backed orders, server-side pricing, stock
│   │   ├── auth/                   # JWT + Auth0 + Brevo OTP (brevo.service, email-otp.entity)
│   │   ├── products/ pricing/ ai/  # listings, fair-price engine, Gemini + ElevenLabs
│   │   ├── auctions/ inquiries/    # Nilaam live bidding, buyer–artisan enquiries
│   │   └── database/               # TypeORM setup, seeds, pg-mem fallback
│   ├── public/                     # the SPA: index.html · app.js · market.js · styles.css
│   └── public/assets/market/       # owner product & category photography
├── frontend/  mobile/              # Flutter companion app scaffolding
└── docs/                           # PRD & design documents
```

---

<div align="center">

**Shilpika** — *no ghost credit, no anonymous appropriation. Every piece carries its maker's name, voice, and a fair price.* 🪔

</div>

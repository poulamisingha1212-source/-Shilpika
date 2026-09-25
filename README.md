# Artisan AI Marketplace

> **Voice-first, AI-assisted marketplace and business manager for marginalized artisans.**
> 
> *"Your digital business assistant — not another complicated e-commerce form."*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?logo=nestjs)](https://nestjs.com/)
[![Flutter](https://img.shields.io/badge/Mobile-Flutter-02569B?logo=flutter)](https://flutter.dev/)
[![Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google)](https://ai.google.dev/)

---

## Overview

Artisan AI Marketplace solves the digital commerce gap for traditional artisans who may lack photography, catalog writing, pricing, language, and technical skills. The app turns **a photo + a spoken product description** into a professional, multilingual, e-commerce-ready listing with AI-generated content and dynamic pricing.

### Core Flow

```
📸 Photo → 🎨 AI Image Studio → 🎤 Voice Description → 🤖 AI Catalog 
→ 📝 Artisan Review/Edit → 💰 Price Recommendation → 🚀 Publish → 🛒 Buyer Discovers
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Flutter Mobile App                          │
│    Splash → Language → Auth → Dashboard → Add Product           │
│    Voice Cataloger → AI Studio → Pricing → Marketplace          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼─────────────────────────────────────┐
│              NestJS Backend (TypeScript)                         │
│    Auth0 JWT → Products → AI Services → Pricing → Marketplace   │
├─────────────┬──────────────┬───────────────┬────────────────────┤
│  Gemini AI  │  ElevenLabs  │   Tiger Data  │   Google Cloud     │
│  (catalog)  │  (voice)     │   (pricing)   │   (storage/deploy) │
└─────────────┴──────────────┴───────────────┴────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    PostgreSQL Database                           │
│  Users · ArtisanProfiles · Products · Media · VoiceInputs       │
│  AIListingVersions · CostInputs · MarketObservations             │
│  PriceRecommendations · Inquiries                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- **Flutter SDK** ≥ 3.0 (for mobile)
- Optional: Docker (for PostgreSQL)

### 1. Clone and Setup

```bash
git clone <repo-url>
cd artisan-ai-marketplace

# Copy environment variables
cp .env.example backend/.env
# Edit backend/.env with your configuration
```

### 2. Start PostgreSQL

```bash
# Using Docker
docker run -d --name artisan-db \
  -e POSTGRES_DB=artisan_marketplace \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 postgres:16

# Or use your local PostgreSQL installation
```

### 3. Backend Setup

```bash
cd backend
npm install

# The database schema is auto-created in development (synchronize: true)
# Or run migrations explicitly:
npm run migration:run

# Seed demo data (5 artisans, 15 products, market observations)
npm run seed

# Start development server
npm run start:dev
```

The backend will be available at: **http://localhost:3000**

- API: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/api/docs`

### 4. Mobile App Setup

```bash
cd mobile
flutter pub get
flutter run
```

---

## Environment Variables

| Variable | Required | Purpose | Default |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | — |
| `DATABASE_HOST` | ✅ | DB host | `localhost` |
| `DATABASE_PORT` | ✅ | DB port | `5432` |
| `DATABASE_USER` | ✅ | DB username | `postgres` |
| `DATABASE_PASSWORD` | ✅ | DB password | — |
| `DATABASE_NAME` | ✅ | DB name | `artisan_marketplace` |
| `AUTH0_DOMAIN` | ⚠️ | Auth0 tenant domain | — (uses dev JWT) |
| `AUTH0_CLIENT_ID` | ⚠️ | Auth0 client ID | — |
| `AUTH0_CLIENT_SECRET` | ⚠️ | Auth0 client secret | — |
| `AUTH0_AUDIENCE` | ⚠️ | Auth0 API audience | — |
| `GEMINI_API_KEY` | ⚠️ | Gemini AI API key | — (uses mock) |
| `ELEVENLABS_API_KEY` | ⚠️ | ElevenLabs API key | — (uses mock) |
| `ELEVENLABS_VOICE_ID` | ⚠️ | ElevenLabs voice ID | `21m00Tcm4TlvDq8ikWAM` |
| `GOOGLE_CLOUD_PROJECT` | ⚠️ | GCP project ID | — |
| `GOOGLE_APPLICATION_CREDENTIALS` | ⚠️ | Path to GCP credentials JSON | — |
| `STORAGE_BUCKET` | ⚠️ | GCS bucket name | — (uses local mock) |
| `STORAGE_PROVIDER` | ⚠️ | `local` or `gcs` | `local` |
| `IMAGE_AI_PROVIDER` | ⚠️ | `mock`, `removebg`, or `gemini` | `mock` |
| `REMOVEBG_API_KEY` | ⚠️ | remove.bg API key | — |
| `MARKET_DATA_PROVIDER` | ⚠️ | `mock` or `tiger` | `mock` |
| `MARKET_DATA_PROVIDER_URL` | ⚠️ | Tiger Data API URL | — |
| `MARKET_DATA_PROVIDER_API_KEY` | ⚠️ | Tiger Data API key | — |
| `JWT_SECRET` | ✅ | JWT secret (dev mode) | — |
| `PORT` | — | Server port | `3000` |
| `NODE_ENV` | — | `development` or `production` | `development` |

> **⚠️ Required for real integrations. App works in mock mode without them.**

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/health` | — | Health check |
| `POST` | `/api/v1/auth/dev-token` | — | Generate dev JWT (dev only) |
| `POST` | `/api/v1/auth/profile` | JWT | Create/update user profile |
| `GET` | `/api/v1/auth/me` | JWT | Get current user |
| `POST` | `/api/v1/products` | JWT | Create product |
| `GET` | `/api/v1/products` | — | Search/list published products |
| `GET` | `/api/v1/products/my` | JWT | Get artisan's own products |
| `GET` | `/api/v1/products/:id` | — | Get product by ID |
| `PATCH` | `/api/v1/products/:id` | JWT | Update product |
| `POST` | `/api/v1/products/:id/publish` | JWT | Publish product |
| `POST` | `/api/v1/products/:id/media` | JWT | Upload product image |
| `GET` | `/api/v1/products/:id/media` | — | Get product media |
| `POST` | `/api/v1/ai/catalog-generate` | JWT | Generate AI catalog |
| `POST` | `/api/v1/ai/transcribe` | JWT | Transcribe voice to text |
| `POST` | `/api/v1/ai/voice-synthesize` | JWT | Text to speech |
| `POST` | `/api/v1/ai/image-enhance` | JWT | Enhance product image |
| `POST` | `/api/v1/ai/price-recommendation` | JWT | Get price range recommendation |
| `GET` | `/api/v1/marketplace/feed` | — | Browse marketplace |
| `POST` | `/api/v1/inquiries` | JWT | Send buyer inquiry |
| `GET` | `/api/v1/inquiries/my` | JWT | Get my inquiries |
| `GET` | `/api/v1/artisans` | — | List artisan profiles |
| `GET` | `/api/v1/artisans/:id` | — | Get artisan profile |
| `GET` | `/api/v1/analytics/artisan` | JWT | Artisan dashboard analytics |
| `GET` | `/api/v1/analytics/admin` | JWT | Admin overview |

Full interactive docs: `http://localhost:3000/api/docs`

---

## Commands Reference

```bash
# Backend
npm run start:dev          # Development server with hot reload
npm run build              # Production build
npm run start:prod         # Run production build
npm run test               # Run unit tests
npm run test:e2e           # Run e2e tests
npm run migration:run      # Run database migrations
npm run migration:revert   # Revert last migration
npm run seed               # Seed demo data

# Mobile
flutter run                # Run on connected device/emulator
flutter build apk          # Build Android APK
flutter build ios          # Build iOS (requires macOS + Xcode)
flutter test               # Run Flutter tests
```

---

## Hackathon Demo Script

1. **Open app** in artisan mode (Priya Sharma)
2. **Select language**: Hindi (हिंदी)
3. **Tap "Add Product"** → large orange CTA on dashboard
4. **Take photo** with camera
5. **AI Image Studio**: shows before/after enhancement
6. **Record voice**: describe product naturally in Hindi
7. **AI generates catalog**: title, description, category, tags in EN + HI
8. **Edit catalog**: show all fields are editable
9. **Enter costs**: ₹100 material + ₹200 labor
10. **Price recommendation**: shows ₹450–₹800 range with factors
11. **Publish**: confirmation screen
12. **Switch to buyer mode** → browse marketplace → find product → send inquiry

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Flutter (cross-platform iOS/Android) |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL + TypeORM |
| AI Catalog | Google Gemini 1.5 Flash |
| Voice AI | ElevenLabs Scribe (STT) + Multilingual TTS |
| Image AI | remove.bg (background removal) / Gemini |
| Market Data | Tiger Data (configurable adapter) |
| Auth | Auth0 (JWKS) + dev JWT mode |
| Storage | Google Cloud Storage (+ local mock) |
| Logging | Winston (structured JSON) |
| API Docs | Swagger/OpenAPI |
| Rate Limiting | NestJS Throttler |
| Deployment | Google Cloud Run / Docker |

---

## Integrations Status

| Integration | Status | Notes |
|-------------|--------|-------|
| PostgreSQL | ✅ Implemented | Auto-sync in dev, migrations in prod |
| Auth0 JWT | ✅ Implemented | Falls back to local JWT in dev |
| Gemini AI | ✅ Implemented | Mock fallback when `GEMINI_API_KEY` absent |
| ElevenLabs STT | ✅ Implemented | Mock fallback when `ELEVENLABS_API_KEY` absent |
| ElevenLabs TTS | ✅ Implemented | Mock fallback when `ELEVENLABS_API_KEY` absent |
| Tiger Data | ✅ Implemented | Seeded mock data + real adapter |
| Google Cloud Storage | ✅ Implemented | Local mock when `STORAGE_BUCKET` absent |
| Image Enhancement | ✅ Implemented | Mock/removebg/gemini (set `IMAGE_AI_PROVIDER`) |

---

## Known Limitations

1. **Flutter**: Screen stubs for PricingScreen, ProductDetail, ArtisanProfile, Settings need full implementation
2. **Real GCS upload**: Requires `@google-cloud/storage` to be installed separately (optional dep)
3. **ElevenLabs language support**: Not all Indian languages are directly supported; interface is ready for provider substitution
4. **Image enhancement**: Full pixel-level enhancement requires a production image AI service (remove.bg or custom model)
5. **Payment flow**: Not implemented in MVP — inquiry-based contact only
6. **Push notifications**: Not implemented
7. **Offline support**: Limited — requires connectivity for AI features

---

## Project Structure

```
artisan-ai-marketplace/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── auth/               # Auth0 JWT strategy
│   │   ├── users/              # User + ArtisanProfile
│   │   ├── products/           # Product CRUD
│   │   ├── media/              # Image upload/storage
│   │   ├── ai/
│   │   │   ├── gemini/         # Gemini catalog service
│   │   │   ├── voice/          # ElevenLabs STT/TTS
│   │   │   └── image/          # Image enhancement
│   │   ├── pricing/            # PricingService + Tiger Data adapter
│   │   ├── marketplace/        # Feed + search
│   │   ├── inquiries/          # Buyer inquiries
│   │   ├── analytics/          # Dashboard metrics
│   │   ├── common/             # Guards, filters, interceptors
│   │   └── database/seeds/     # Demo data seeder
│   └── test/                   # Unit tests
├── mobile/                     # Flutter app
│   └── lib/
│       ├── core/               # Services, providers, router
│       ├── features/           # Screens by feature
│       └── shared/             # Theme, shared widgets
└── docs/                       # Architecture docs
```

---

## License

MIT — See [LICENSE](LICENSE)

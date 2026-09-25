# Hackathon Demo Script — Artisan AI Marketplace

## Duration: ~5 minutes

---

### Quick Access URLs (Localhost Live)
- **Interactive Web App**: http://localhost:3000
- **Interactive Swagger Docs**: http://localhost:3000/api/docs
- **REST API Feed**: http://localhost:3000/api/v1/marketplace/feed

---

### Demo Flow

#### 1. Platform & Artisan Overview (30s)
- Open browser at **http://localhost:3000**
- Point out the platform header: **Artisan AI (कारीगर AI)**
- Show the **Device Simulator Switcher**: Toggle between **Mobile View** (390px phone frame simulation) and **Desktop View**
- Point out the active verified artisan: **Priya Sharma** (Jaipur, Rajasthan — Blue Pottery)
- Highlight the **Live Metrics**: Total Products (15), Total Views (480), Inquiries (24)

#### 2. The Voice-First Artisan Experience (90s)
- Tap the glowing orange CTA: **"Add Product with AI (नया उत्पाद जोड़ें)"**
- **Step 1: Photo & AI Image Studio**
  - Select one of the curated craft presets (e.g. *Jaipur Blue Pottery Vase*, *Banarasi Silk Saree*, *Chikankari Kurta*, or *Moradabad Brass Diya*)
  - Drag the interactive **Before / After** split slider:
    - *"Notice how AI automatically removes workshop background clutter and enhances studio lighting while preserving the authentic handmade texture."*
  - Click **"Next: Record Voice Story"**

#### 3. Voice-to-Catalog & Multilingual AI (60s)
- **Step 2: Voice Cataloger**
  - Tap the pulsing microphone button to speak in Hindi or English (or click the quick preset voice chips)
  - Audio confirmation plays: *"आपका विवरण रिकॉर्ड हो गया है।"*
  - Click **"Generate AI Catalog"**
- **Step 3: Gemini 1.5 Flash Bilingual Catalog**
  - Point out that Gemini automatically extracted craft attributes and created **English** and **Hindi** listings
  - Switch tabs between **English Listing** and **हिन्दी Listing**
  - Show the auto-generated tags, craft classification, and editable fields (*"Artisan remains in full control"*)
  - Click **"Next: Dynamic Pricing Assistant"**

#### 4. Dynamic Pricing Assistant & Tiger Data (60s)
- **Step 4: Dynamic Pricing**
  - Point out the cost breakdown: Material ₹150 + Labor ₹300 + Transport ₹50
  - Point out the **Tiger Data Market Benchmark Card**:
    - Shows observed market prices for Jaipur Blue Pottery (₹450 - ₹750)
  - Show the recommended fair price range: **₹450 - ₹650** (Cost + 25% fair profit margin)
  - Click **"Review & Publish"**

#### 5. Instant Publishing & Buyer Feed (60s)
- **Step 5: Publish**
  - Click **"Publish Product Now"**
  - Audio celebration plays: *"बधाई हो! आपका उत्पाद बाज़ार में प्रकाशित हो गया है।"*
- Switch to **Buyer Feed** role in the top header
  - See the newly published product appear live in the marketplace feed
  - Test category filters (Pottery, Textile, Clothing, Brass & Metal)
  - Test real-time search
  - Click any product to open the **Product Detail Modal**
  - Click **"Listen to Artisan's Story"** for audio narration
  - Submit a test inquiry: *"Can you customize the floral pattern for a wedding gift?"*
  - Show immediate confirmation

#### 6. Admin Analytics & Impact (30s)
- Switch to **Admin** role in the top header
- View registered artisans, live listings, buyer connections, and AI model telemetry:
  - Gemini 1.5 Flash (Zod schema validation active)
  - ElevenLabs voice engine (ready)
  - Tiger Data market benchmark sync
  - PostgreSQL database engine (online & seeded)

---

### Key Takeaways for Judges

1. **True Voice-First UX**: Low digital literacy artisans can publish products in under 60 seconds with zero typing.
2. **Transparent, Explainable AI**: Every field is editable, and price suggestions explain *why* based on real costs and market data.
3. **Bilingual by Default**: Complete parity between English and Hindi listings for domestic and international buyers.
4. **Zero External Setup Needed**: Built-in in-memory PostgreSQL emulator and intelligent mock adapters ensure the entire app runs out of the box on `http://localhost:3000`.
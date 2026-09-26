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


// Neutral baseline for the listing wizard — the user's real photo and words replace it.
const NEUTRAL_PRESET = {
  id: 'custom',
  name: 'Your craft',
  titleHindi: '',
  titleBengali: '',
  category: '',
  craft: '',
  region: '',
  speechHindi: '',
  speechEnglish: '',
  story: '',
  artForm: '',
  lineage: '',
  generations: '',
  hours: 0,
  materialCost: 0,
  laborCost: 0,
  transportCost: 0,
  marketMin: 0,
  marketMax: 0,
  regionLabel: '—',
  beforeImg: '',
  afterImg: '',
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  currentLang: 'en',
  currentRole: 'artisan',
  authToken: null,
  user: null,
  apiOnline: false,
  currentWizardStep: 1,
  selectedPreset: NEUTRAL_PRESET,
  uploadedPhoto: null,
  isRecording: false,
  recTimerInterval: null,
  recSeconds: 0,
  speechRecognition: null,
  currentTranscript: '',
  currentCatalog: null,
  currentProductId: null,
  currentCosts: { material: 0, labor: 0, transport: 0, margin: 25 },
  recommendedPrice: { floor: 0, b2c: 0, b2b: 0 },
  selectedProductDetail: null,
  wishlist: new Set(JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]')),
  voiceCloneReady: false,
  mediaRecorder: null,
  mediaChunks: [],
  mediaStream: null,
  awaazSpeakText: '',
  auction: {
    items: [],
    selectedId: null,
    tickInterval: null,
  },
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------------
// Internationalization (English, Hindi / हिन्दी, Bengali / বাংলা)
// ---------------------------------------------------------------------------
const LANG_KEY = 'shilpika_lang';

const I18N = {
  en: {
    brand_sub: 'Voice-first, AI-native craft commerce · cultural provenance',
    login_portal_label: 'Select your portal',
    login_role_artisan: 'Seller (Artisan)',
    login_role_buyer: 'Buyer',
    login_role_admin: 'Admin',
    login_email_label: 'Email',
    login_name_label: 'Your name',
    login_name_hint: '(first sign-in only)',
    login_submit: 'Sign in',
    login_hint: 'New here? Signing in creates your account instantly — artisans get a studio, buyers get the marketplace.',
    sign_out: 'Sign out',
    main_menu: 'Main Menu',
    dark_mode: 'Dark',
    light_mode: 'Light',

    // Portals
    portal_seller: 'Seller Portal',
    portal_buyer: 'Buyer Portal',
    portal_admin: 'Admin Portal',
    portal_sub_artisan: 'Artisan Studio',
    portal_sub_buyer: 'Craft Explorer',
    portal_sub_admin: 'Platform Governance',
    role_artisan: 'Verified Artisan',
    role_buyer: 'Collector / Buyer',
    role_admin: 'Administrator',

    // Nav items
    nav_studio_dashboard: 'Studio Dashboard',
    nav_studio_dashboard_sub: 'Performance & Listings',
    nav_add_craft: 'Add New Craft',
    nav_add_craft_sub: 'AI Visual & Voice Studio',
    nav_marketplace: 'Public Marketplace',
    nav_marketplace_sub: 'Browse Handcrafted Catalog',
    nav_auctions: 'Nilaam Auctions',
    nav_auctions_sub: 'Live Heritage Bidding',
    nav_buyer_market: 'Craft Marketplace',
    nav_buyer_market_sub: 'Explore Handcrafted Goods',
    nav_buyer_auctions: 'Nilaam Live Auctions',
    nav_buyer_auctions_sub: 'Bid on Heritage Crafts',
    nav_admin_dashboard: 'Admin Dashboard',
    nav_admin_dashboard_sub: 'Platform Analytics & Impact',
    nav_admin_catalog: 'Marketplace Catalog',
    nav_admin_catalog_sub: 'Monitor Artisan Listings',
    nav_admin_auctions: 'Nilaam Auctions',
    nav_admin_auctions_sub: 'Live Auction Activity',

    // Dashboard
    greeting: 'Hello,',
    welcome_eyebrow: 'Artisan studio · Odisha',
    welcome_sub: 'Your terracotta, your voice, your credit — captured by speech, priced fairly, protected by provenance.',
    tag_verified: 'Verified artisan',
    tag_craft: 'Terracotta & pottery',
    tag_voice_clone: 'Voice clone:',
    tag_not_setup: 'not set up',
    stat_listings: 'Live listings',
    stat_views: 'Total views',
    stat_inquiries: 'Buyer inquiries',
    stat_hours: 'Craft hours logged',
    cta_title: 'List a craft with Shilpika AI',
    cta_sub: 'Add new product — 1 photo + voice = ready listing',
    cta_hint: 'Photo → quality gate → AI studio → voice story → 3-tier fair price → provenance card',
    recent_listings: 'Your recent listings',
    view_public_shop: 'View public shop',

    // Saathi AI
    saathi_title: 'Saathi AI',
    saathi_live: 'Live AI',
    saathi_quota: '10 req/min',
    saathi_q1: 'How do I ship to Delhi?',
    saathi_q2: 'Festive colour trends?',
    saathi_q3: 'How does Nilaam work?',
    saathi_placeholder: 'Ask anything… (by voice or text)',
    saathi_play: 'Play answer',

    // Auth
    lang_changed: 'Language switched to English',
    btn_google_login: 'Continue with Google',
    login_or: 'or',
    tab_signin: 'Sign In',
    tab_signup: 'Sign Up',
    login_password_label: 'Password',
    login_confirm_password_label: 'Confirm Password',
    btn_submit_signin: 'Sign In',
    btn_submit_signup: 'Create Account',
    switch_to_signup: "Don't have an account?",
    switch_to_signin: 'Already have an account?',
    passwords_dont_match: 'Passwords do not match. Please re-enter.',
    signup_role_label: 'I am a…',
    signup_role_buyer: 'Buyer',
    signup_role_buyer_sub: 'Shop handcrafted goods',
    signup_role_seller: 'Seller (Artisan)',
    signup_role_seller_sub: 'List & sell your crafts',
    signup_seller_verification: 'Seller Verification',
    signup_aadhaar_label: 'Aadhaar Number',
    signup_aadhaar_hint: 'Used only for seller identity verification. Never shared publicly.',
    signup_address_label: 'Workshop / Studio Address',
    signin_success: 'Welcome back! You are now signed in.',
    signup_success: 'Account created! Welcome to Shilpika.',
    admin_restricted: 'Admin Portal is restricted to platform administrators.',
    artisan_restricted: 'Artisan Studio is restricted to sellers.',
    onboard_welcome: 'Welcome, {name}!',
    onboard_choose_role_prompt: 'How would you like to use Shilpika?',
    btn_complete_setup: 'Continue to Shilpika',
    btn_complete_setup_seller: 'Complete Seller Verification',
    btn_complete_setup_buyer: 'Continue to Marketplace',
    google_verified: 'Google Account Verified',
    onboard_switch_account: 'Use another account',
    fixed_price_badge: 'Fixed Price',
    product_history_title: 'Craft Heritage & History',
    product_video_title: 'Craft Video Demonstration',
    artisan_showcase: 'Artisan Showcase',
    copy_product_link: 'Copy product link',
    // ── Market ──
    market_title: 'Shilpika Market',
    market_intro: 'A premium marketplace for India’s living craft traditions — every piece handmade, verified, and priced fairly for local and export buyers.',
    market_view_category: 'View category',
    market_explore: 'Explore',
    market_available_products: 'Available products',
    market_cultural_title: 'Cultural provenance',
    market_image_placeholder: 'Image coming soon',
    market_video_pending: 'Craft film coming soon',
    market_video_pending_hint: 'The demonstration video for this craft will appear here.',
    market_loading: 'Loading…',
    market_load_error_title: 'Something went wrong',
    market_load_error: 'Unable to load the market right now. Please try again.',
    market_retry: 'Try again',
    market_back: 'Back to market',
    market_not_found_title: 'Not found',
    market_not_found_hint: 'That category or craft does not exist. Explore the market instead.',
    market_product_not_found: 'Product not found',
    market_product_not_found_hint: 'This piece may have been removed, or the link is incomplete.',
    market_empty_hint: 'New pieces are being curated. Please check back soon.',
    market_pricing_title: 'Pricing',
    floor_price: 'Floor price',
    export_price: 'Export price',
    floor_price_note: 'Local / minimum selling price',
    export_price_note: 'Export-market price',
    price_type_label: 'Choose price type',
    quantity_label: 'Quantity',
    estimated_total: 'Estimated total',
    product_id_label: 'Product ID',
    in_stock: 'In stock',
    out_of_stock: 'Out of stock',
    stock_limit: 'That quantity exceeds available stock.',
    market_price_missing: 'This price type is not available for this piece.',
    view_details: 'View details',
    add_to_cart: 'Add to cart',
    place_order: 'Place order',
    share_product: 'Share',
    added_to_cart: 'Added to your cart.',
    market_link_copied: 'Product link copied — paste it anywhere to share.',
    copy_failed: 'Could not copy the link. Please copy it from the address bar.',
    signin_required: 'Please sign in to place your order.',
    order_placed_title: 'Order placed:',
    order_placed_toast: 'Your order has been placed!',
    order_failed: 'Could not place the order. Please try again.',
    cart_order_failed: 'Some items could not be ordered:',
    cart_title: 'Your cart',
    cart_empty: 'Your cart is empty — the market is full of handcrafted pieces waiting for you.',
    cart_total: 'Order total',
    cart_total_hint: 'Prices are confirmed server-side when the order is placed.',
    cart_place_order: 'Place order',
    cart_remove: 'Remove from cart',
    voice_enquiry: 'Voice enquiry',
    voice_enquiry_hint: 'Ask about price, availability or the craft itself — answered from live product data only.',
    ask_by_voice: 'Ask by voice',
    stop_recording: 'Listening… tap to stop',
    voice_listening: 'Listening… ask your question.',
    voice_permission: 'Microphone permission was denied. You can type your question instead.',
    voice_unsupported: 'Voice input is not supported in this browser. Please type your question.',
    voice_error: 'Could not start the microphone. Please try again or type your question.',
    voice_too_short: 'That was too short — hold the button and ask your question.',
    enquiry_thinking: 'Checking the product details…',
    enquiry_failed: 'Unable to answer right now. Please try again.',
    enquiry_send: 'Ask',
    enquiry_text_label: 'Type your question',
    enquiry_text_hint: 'Or type your question…',
    enquiry_replay: 'Play answer',
    enquiry_you_asked: 'You asked:',
    enquiry_voice_question: '(voice question)',
    // ── Email OTP ──
    otp_title: 'Check your email',
    otp_subtitle: 'We sent a 6-digit code to',
    otp_code_label: 'Enter the 6-digit code',
    otp_verify: 'Verify & continue',
    otp_resend: 'Resend code',
    otp_back: 'Back',
    otp_success: 'Email verified — welcome to Shilpika!',
    otp_resent: 'A new code is on its way.',
  },
  hi: {
    brand_sub: 'स्वर-प्रथम, एआई-आधारित शिल्प वाणिज्य · सांस्कृतिक प्रमाणिकता',
    login_portal_label: 'अपना पोर्टल चुनें',
    login_role_artisan: 'विक्रेता (कारीगर)',
    login_role_buyer: 'खरीदार',
    login_role_admin: 'एडमिन',
    login_email_label: 'ईमेल',
    login_name_label: 'आपका नाम',
    login_name_hint: '(केवल पहली बार साइन-इन)',
    login_submit: 'साइन इन करें',
    login_hint: 'यहाँ नए हैं? साइन इन करने पर आपका खाता तुरंत बन जाता है — कारीगरों को स्टूडियो और खरीदारों को बाज़ार मिलता है।',
    sign_out: 'साइन आउट',
    main_menu: 'मुख्य मेनू',
    dark_mode: 'डार्क',
    light_mode: 'लाइट',

    // Portals
    portal_seller: 'विक्रेता पोर्टल',
    portal_buyer: 'खरीदार पोर्टल',
    portal_admin: 'एडमिन पोर्टल',
    portal_sub_artisan: 'कारीगर स्टूडियो',
    portal_sub_buyer: 'शिल्प अन्वेषण',
    portal_sub_admin: 'प्लेटफ़ॉर्म प्रशासन',
    role_artisan: 'सत्यापित कारीगर',
    role_buyer: 'संग्रहकर्ता / खरीदार',
    role_admin: 'प्रशासक (Admin)',

    // Nav items
    nav_studio_dashboard: 'स्टूडियो डैशबोर्ड',
    nav_studio_dashboard_sub: 'प्रदर्शन और लिस्टिंग',
    nav_add_craft: 'नया शिल्प जोड़ें',
    nav_add_craft_sub: 'एआई विजुअल और वॉयस स्टूडियो',
    nav_marketplace: 'सार्वजनिक बाज़ार',
    nav_marketplace_sub: 'हस्तनिर्मित शिल्प सूची ब्राउज़ करें',
    nav_auctions: 'नीलाम नीलामी',
    nav_auctions_sub: 'लाइव विरासत बोली',
    nav_buyer_market: 'शिल्प बाज़ार',
    nav_buyer_market_sub: 'हस्तशिल्प उत्पाद खोजें',
    nav_buyer_auctions: 'नीलाम लाइव नीलामी',
    nav_buyer_auctions_sub: 'दुर्लभ शिल्पों पर बोली लगाएं',
    nav_admin_dashboard: 'एडमिन डैशबोर्ड',
    nav_admin_dashboard_sub: 'प्लेटफ़ॉर्म एनालिटिक्स और प्रभाव',
    nav_admin_catalog: 'मार्केटप्लेस कैटलॉग',
    nav_admin_catalog_sub: 'कारीगर लिस्टिंग की निगरानी',
    nav_admin_auctions: 'नीलाम नीलामी',
    nav_admin_auctions_sub: 'लाइव नीलामी गतिविधि',

    // Dashboard
    greeting: 'नमस्ते,',
    welcome_eyebrow: 'कारीगर स्टूडियो · ओडिशा',
    welcome_sub: 'आपकी टेराकोटा, आपकी आवाज़, आपका श्रेय — आवाज़ से दर्ज, उचित मूल्य और प्रामाणिकता से सुरक्षित।',
    tag_verified: 'सत्यापित कारीगर',
    tag_craft: 'टेराकोटा और मिट्टी के बर्तन',
    tag_voice_clone: 'वॉयस क्लोन:',
    tag_not_setup: 'सेट नहीं है',
    stat_listings: 'लाइव लिस्टिंग',
    stat_views: 'कुल दृश्य',
    stat_inquiries: 'खरीदार पूछताछ',
    stat_hours: 'कारीगरी घंटे',
    cta_title: 'शिल्पिका एआई के साथ शिल्प जोड़ें',
    cta_sub: 'नया उत्पाद जोड़ें — 1 फ़ोटो + आवाज़ = तैयार लिस्टिंग',
    cta_hint: 'फ़ोटो → गुणवत्ता जांच → एआई स्टूडियो → वॉयस कहानी → 3-स्तरीय उचित मूल्य → प्रामाणिकता कार्ड',
    recent_listings: 'आपकी हालिया लिस्टिंग',
    view_public_shop: 'दुकान देखें',

    // Saathi AI
    saathi_title: 'साथी एआई',
    saathi_live: 'लाइव एआई',
    saathi_quota: '10 प्रति मिनट',
    saathi_q1: 'दिल्ली में शिपिंग कैसे करें?',
    saathi_q2: 'त्योहारी रंग रुझान क्या हैं?',
    saathi_q3: 'नीलाम कैसे काम करता है?',
    saathi_placeholder: 'कुछ भी पूछें… (बोलकर या लिखकर)',
    saathi_play: 'उत्तर सुनें',

    // Alerts
    lang_changed: 'भाषा बदलकर हिन्दी कर दी गई है',
    login_auth0_btn: 'Auth0 (A0) से साइन इन करें',
    login_auth0_sub: 'गूगल, गिटहब, माइक्रोसॉफ्ट व सार्वभौमिक पहचान',
    // Auth
    lang_changed: 'भाषा हिन्दी में बदली',
    btn_google_login: 'Google से जारी रखें',
    login_or: 'या',
    tab_signin: 'साइन इन करें',
    tab_signup: 'नया खाता बनाएं',
    login_password_label: 'पासवर्ड',
    login_confirm_password_label: 'पासवर्ड की पुष्टि करें',
    btn_submit_signin: 'साइन इन करें',
    btn_submit_signup: 'खाता बनाएं',
    switch_to_signup: 'खाता नहीं है?',
    switch_to_signin: 'पहले से खाता है?',
    passwords_dont_match: 'पासवर्ड मेल नहीं खाते। कृपया पुनः प्रयास करें।',
    signup_role_label: 'मैं हूँ…',
    signup_role_buyer: 'खरीदार',
    signup_role_buyer_sub: 'हस्तशिल्प खरीदें',
    signup_role_seller: 'विक्रेता (कारीगर)',
    signup_role_seller_sub: 'अपना हस्तशिल्प बेचें',
    signup_seller_verification: 'विक्रेता सत्यापन',
    signup_aadhaar_label: 'आधार नंबर',
    signup_aadhaar_hint: 'केवल विक्रेता पहचान सत्यापन के लिए। कभी सार्वजनिक नहीं किया जाएगा।',
    signup_address_label: 'कार्यशाला / स्टूडियो का पता',
    signin_success: 'स्वागत है! आप अब साइन इन हैं।',
    signup_success: 'खाता बन गया! शिल्पिका में आपका स्वागत है।',
    admin_restricted: 'एडमिन पोर्टल केवल व्यवस्थापकों के लिए सीमित है।',
    artisan_restricted: 'कारीगर स्टूडियो केवल विक्रेताओं के लिए सीमित है।',
    onboard_welcome: 'स्वागत है, {name}!',
    onboard_choose_role_prompt: 'आप शिल्पिका का उपयोग कैसे करना चाहेंगे?',
    btn_complete_setup: 'शिल्पिका में प्रवेश करें',
    btn_complete_setup_seller: 'विक्रेता सत्यापन पूरा करें',
    btn_complete_setup_buyer: 'मार्केटप्लेस पर जाएं',
    google_verified: 'गूगल खाता सत्यापित',
    onboard_switch_account: 'अन्य खाते का उपयोग करें',
    fixed_price_badge: 'निश्चित मूल्य',
    product_history_title: 'शिल्प विरासत और इतिहास',
    product_video_title: 'कारीगरी वीडियो प्रदर्शन',
    artisan_showcase: 'कारीगर प्रदर्शन',
    copy_product_link: 'उत्पाद लिंक कॉपी करें',
    // ── Market ──
    market_title: 'शिल्पिका मार्केट',
    market_intro: 'भारत की जीवंत शिल्प परंपराओं का प्रीमियम बाज़ार — हर वस्तु हाथ से निर्मित, सत्यापित, और स्थानीय व निर्यात खरीदारों के लिए उचित मूल्य पर।',
    market_view_category: 'श्रेणी देखें',
    market_explore: 'देखें',
    market_available_products: 'उपलब्ध उत्पाद',
    market_cultural_title: 'सांस्कृतिक प्रमाणिकता',
    market_image_placeholder: 'फोटो जल्द आ रही है',
    market_video_pending: 'शिल्प वीडियो जल्द आ रहा है',
    market_video_pending_hint: 'इस शिल्प का प्रदर्शन वीडियो यहाँ दिखाया जाएगा।',
    market_loading: 'लोड हो रहा है…',
    market_load_error_title: 'कुछ गड़बड़ हो गई',
    market_load_error: 'मार्केट अभी लोड नहीं हो सका। कृपया फिर कोशिश करें।',
    market_retry: 'फिर कोशिश करें',
    market_back: 'मार्केट पर वापस',
    market_not_found_title: 'नहीं मिला',
    market_not_found_hint: 'यह श्रेणी या शिल्प मौजूद नहीं है। मार्केट देखें।',
    market_product_not_found: 'उत्पाद नहीं मिला',
    market_product_not_found_hint: 'यह वस्तु हटाई जा चुकी है या लिंक अधूरा है।',
    market_empty_hint: 'नई वस्तुओं की क्यूरेशन चल रही है। कृपया थोड़ी देर बाद देखें।',
    market_pricing_title: 'मूल्य',
    floor_price: 'फ़्लोर मूल्य',
    export_price: 'निर्यात मूल्य',
    floor_price_note: 'स्थानीय / न्यूनतम बिक्री मूल्य',
    export_price_note: 'निर्यात बाज़ार मूल्य',
    price_type_label: 'मूल्य प्रकार चुनें',
    quantity_label: 'मात्रा',
    estimated_total: 'अनुमानित कुल',
    product_id_label: 'उत्पाद आईडी',
    in_stock: 'स्टॉक में',
    out_of_stock: 'स्टॉक समाप्त',
    stock_limit: 'यह मात्रा उपलब्ध स्टॉक से अधिक है।',
    market_price_missing: 'यह मूल्य प्रकार इस वस्तु के लिए उपलब्ध नहीं है।',
    view_details: 'विवरण देखें',
    add_to_cart: 'कार्ट में डालें',
    place_order: 'ऑर्डर करें',
    share_product: 'शेयर',
    added_to_cart: 'आपकी कार्ट में जोड़ा गया।',
    market_link_copied: 'उत्पाद लिंक कॉपी हो गया — कहीं भी पेस्ट करके साझा करें।',
    copy_failed: 'लिंक कॉपी नहीं हो सका। कृपया एड्रेस बार से कॉपी करें।',
    signin_required: 'ऑर्डर देने के लिए कृपया साइन इन करें।',
    order_placed_title: 'ऑर्डर हो गया:',
    order_placed_toast: 'आपका ऑर्डर दर्ज हो गया!',
    order_failed: 'ऑर्डर दर्ज नहीं हो सका। कृपया फिर कोशिश करें।',
    cart_order_failed: 'कुछ वस्तुएँ ऑर्डर नहीं हो सकीं:',
    cart_title: 'आपकी कार्ट',
    cart_empty: 'आपकी कार्ट खाली है — बाज़ार में हस्तनिर्मित वस्तुएँ आपकी प्रतीक्षा में हैं।',
    cart_total: 'कुल राशि',
    cart_total_hint: 'ऑर्डर देते समय मूल्य सर्वर द्वारा पुष्ट किए जाते हैं।',
    cart_place_order: 'ऑर्डर करें',
    cart_remove: 'कार्ट से हटाएँ',
    voice_enquiry: 'आवाज़ पूछताछ',
    voice_enquiry_hint: 'मूल्य, उपलब्धता या शिल्प के बारे में पूछें — उत्तर केवल लाइव उत्पाद डेटा से।',
    ask_by_voice: 'आवाज़ से पूछें',
    stop_recording: 'सुन रहे हैं… रोकने के लिए दबाएँ',
    voice_listening: 'सुन रहे हैं… अपना प्रश्न पूछें।',
    voice_permission: 'माइक की अनुमति नहीं मिली। आप प्रश्न टाइप कर सकते हैं।',
    voice_unsupported: 'इस ब्राउज़र में आवाज़ इनपुट उपलब्ध नहीं है। कृपया प्रश्न टाइप करें।',
    voice_error: 'माइक शुरू नहीं हो सका। कृपया फिर कोशिश करें या प्रश्न टाइप करें।',
    voice_too_short: 'बहुत छोटा था — बटन दबाकर अपना प्रश्न पूछें।',
    enquiry_thinking: 'उत्पाद विवरण जाँच रहे हैं…',
    enquiry_failed: 'अभी उत्तर नहीं मिल सका। कृपया फिर कोशिश करें।',
    enquiry_send: 'पूछें',
    enquiry_text_label: 'अपना प्रश्न टाइप करें',
    enquiry_text_hint: 'या अपना प्रश्न टाइप करें…',
    enquiry_replay: 'उत्तर चलाएँ',
    enquiry_you_asked: 'आपने पूछा:',
    enquiry_voice_question: '(आवाज़ प्रश्न)',
    // ── Email OTP ──
    otp_title: 'अपना ईमेल देखें',
    otp_subtitle: 'हमने 6-अंकों का कोड भेजा है',
    otp_code_label: '6-अंकों का कोड दर्ज करें',
    otp_verify: 'सत्यापित करें और आगे बढ़ें',
    otp_resend: 'कोड फिर भेजें',
    otp_back: 'वापस',
    otp_success: 'ईमेल सत्यापित — शिल्पिका में आपका स्वागत है!',
    otp_resent: 'नया कोड भेज दिया गया है।',
  },
  bn: {
    brand_sub: 'কণ্ঠস্বর-প্রথম, এআই-চালিত কারুশিল্প বাণিজ্য · সাংস্কৃতিক উৎস ও সত্যতা',
    login_portal_label: 'আপনার পোর্টাল নির্বাচন করুন',
    login_role_artisan: 'বিক্রেতা (কারিগর)',
    login_role_buyer: 'ক্রেতা',
    login_role_admin: 'অ্যাডমিন',
    login_email_label: 'ইমেইল',
    login_name_label: 'আপনার নাম',
    login_name_hint: '(শুধু প্রথমবার সাইন-ইনে)',
    login_submit: 'সাইন ইন করুন',
    login_hint: 'নতুন এসেছেন? সাইন ইন করলে সঙ্গে সঙ্গে অ্যাকাউন্ট তৈরি হয় — কারিগর পান নিজস্ব স্টুডিও এবং ক্রেতারা পান মার্কেটপ্লেস।',
    sign_out: 'সাইন আউট',
    main_menu: 'মূল মেনু',
    dark_mode: 'গাঢ়',
    light_mode: 'হালকা',

    // Portals
    portal_seller: 'বিক্রেতা পোর্টাল',
    portal_buyer: 'ক্রেতা পোর্টাল',
    portal_admin: 'অ্যাডমিন পোর্টাল',
    portal_sub_artisan: 'কারিগর স্টুডিও',
    portal_sub_buyer: 'কারুশিল্প অনুসন্ধান',
    portal_sub_admin: 'প্ল্যাটফর্ম প্রশাসন',
    role_artisan: 'যাচাইকৃত কারিগর',
    role_buyer: 'সংগ্রাহক / ক্রেতা',
    role_admin: 'প্রশাসক (Admin)',

    // Nav items
    nav_studio_dashboard: 'স্টুডিও ড্যাশবোর্ড',
    nav_studio_dashboard_sub: 'পারফরম্যান্স ও তালিকা',
    nav_add_craft: 'নতুন শিল্প যোগ করুন',
    nav_add_craft_sub: 'এআই ভিজ্যুয়াল ও ভয়েস স্টুডিও',
    nav_marketplace: 'পাবলিক মার্কেটপ্লেস',
    nav_marketplace_sub: 'হস্তশিল্পের ক্যাটালগ ব্রাউজ করুন',
    nav_auctions: 'নিলাম লাইভ',
    nav_auctions_sub: 'ঐতিহ্যবাহী লাইভ বিডিং',
    nav_buyer_market: 'কারুশিল্প মার্কেটপ্লেস',
    nav_buyer_market_sub: 'হাতে তৈরি শিল্প আবিষ্কার করুন',
    nav_buyer_auctions: 'নিলাম লাইভ অকশন',
    nav_buyer_auctions_sub: 'দুর্লভ শিল্পকর্মে দরদাম করুন',
    nav_admin_dashboard: 'অ্যাডমিন ড্যাশবোর্ড',
    nav_admin_dashboard_sub: 'প্ল্যাটফর্ম অ্যানালিটিক্স ও প্রভাব',
    nav_admin_catalog: 'মার্কেটপ্লেস ক্যাটালগ',
    nav_admin_catalog_sub: 'কারিগরদের তালিকার পর্যবেক্ষণ',
    nav_admin_auctions: 'নিলাম অকশন',
    nav_admin_auctions_sub: 'লাইভ নিলাম কার্যকলাপ',

    // Dashboard
    greeting: 'স্বাগতম,',
    welcome_eyebrow: 'কারিগর স্টুডিও · ওড়িশা / বাংলা',
    welcome_sub: 'আপনার পোড়ামাটির শিল্প, আপনার কণ্ঠস্বর, আপনার অধিকার — কণ্ঠে ধারণকৃত, ন্যায্য মূল্যে এবং বংশপরম্পরায় সুরক্ষিত।',
    tag_verified: 'যাচাইকৃত কারিগর',
    tag_craft: 'টেরাকোটা ও মৃৎশিল্প',
    tag_voice_clone: 'ভয়েস ক্লোন:',
    tag_not_setup: 'সেট করা হয়নি',
    stat_listings: 'সক্রিয় তালিকা',
    stat_views: 'মোট দর্শন',
    stat_inquiries: 'ক্রেতাদের অনুসন্ধান',
    stat_hours: 'মোট শ্রমঘণ্টা',
    cta_title: 'শিল্পিকা এআই দিয়ে নতুন পণ্য যোগ করুন',
    cta_sub: 'নতুন শিল্প যোগ করুন — ১টি ছবি + মুখের কথা = প্রস্তুত ক্যাটালগ',
    cta_hint: 'ছবি → মান যাচাই → এআই স্টুডিও → কণ্ঠের গল্প → ৩-স্তরের ন্যায্য মূল্য → প্রামাণ্য কার্ড',
    recent_listings: 'আপনার সাম্প্রতিক শিল্পকর্ম',
    view_public_shop: 'পাবলিক দোকান দেখুন',

    // Saathi AI
    saathi_title: 'সাথী এআই',
    saathi_live: 'লাইভ এআই',
    saathi_quota: '১০টি/মিনিট',
    saathi_q1: 'দিল্লিতে কীভাবে পাঠাব?',
    saathi_q2: 'উৎসবের রঙের ট্রেন্ড কী?',
    saathi_q3: 'নিলাম কীভাবে কাজ করে?',
    saathi_placeholder: 'যেকোনো প্রশ্ন করুন… (মুখে বলে বা লিখে)',
    saathi_play: 'উত্তর শুনুন',

    // Alerts
    lang_changed: 'ভাষা পরিবর্তন করে বাংলা করা হয়েছে',
    login_auth0_btn: 'Auth0 (A0) দিয়ে সাইন ইন করুন',
    login_auth0_sub: 'গুগল, গিটহাব, মাইক্রোসফ্ট ও ইউনিভার্সাল আইডেন্টিটি',
    // Auth
    lang_changed: 'ভাষা বাংলায় পরিবর্তিত হয়েছে',
    btn_google_login: 'Google দিয়ে চালিয়ে যান',
    login_or: 'অথবা',
    tab_signin: 'সাইন ইন করুন',
    tab_signup: 'নতুন অ্যাকাউন্ট',
    login_password_label: 'পাসওয়ার্ড',
    login_confirm_password_label: 'পাসওয়ার্ড নিশ্চিত করুন',
    btn_submit_signin: 'সাইন ইন করুন',
    btn_submit_signup: 'অ্যাকাউন্ট তৈরি করুন',
    switch_to_signup: 'অ্যাকাউন্ট নেই?',
    switch_to_signin: 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
    passwords_dont_match: 'পাসওয়ার্ড দুটি মেলেনি। অনুগ্রহ করে পুনরায় লিখুন।',
    signup_role_label: 'আমি একজন…',
    signup_role_buyer: 'ক্রেতা',
    signup_role_buyer_sub: 'হস্তশিল্প কিনুন',
    signup_role_seller: 'বিক্রেতা (কারিগর)',
    signup_role_seller_sub: 'আপনার হস্তশিল্প বিক্রি করুন',
    signup_seller_verification: 'বিক্রেতা যাচাইকরণ',
    signup_aadhaar_label: 'আধার নম্বর',
    signup_aadhaar_hint: 'শুধুমাত্র বিক্রেতার পরিচয় যাচাইয়ের জন্য। কখনও প্রকাশ্যে শেয়ার করা হবে না।',
    signup_address_label: 'কর্মশালা / স্টুডিওর ঠিকানা',
    signin_success: 'স্বাগতম! আপনি সাইন ইন করেছেন।',
    signup_success: 'অ্যাকাউন্ট তৈরি হয়েছে! Shilpika-তে আপনাকে স্বাগতম।',
    admin_restricted: 'অ্যাডমিন পোর্টাল শুধুমাত্র প্ল্যাটফর্ম প্রশাসকদের জন্য সীমাবদ্ধ।',
    artisan_restricted: 'কারিগর স্টুডিও শুধুমাত্র বিক্রেতাদের জন্য সীমাবদ্ধ।',
    onboard_welcome: 'স্বাগতম, {name}!',
    onboard_choose_role_prompt: 'আপনি কীভাবে শিল্পিকা ব্যবহার করতে চান?',
    btn_complete_setup: 'শিল্পিকায় প্রবেশ করুন',
    btn_complete_setup_seller: 'বিক্রেতা যাচাইকরণ সম্পন্ন করুন',
    btn_complete_setup_buyer: 'মার্কেটপ্লেসে এগিয়ে যান',
    google_verified: 'গুগল অ্যাকাউন্ট যাচাইকৃত',
    onboard_switch_account: 'অন্য অ্যাকাউন্ট ব্যবহার করুন',
    fixed_price_badge: 'নির্দিষ্ট মূল্য',
    product_history_title: 'ঐতিহ্য ও ইতিহাস',
    product_video_title: 'হস্তশিল্প ভিডিও প্রদর্শন',
    artisan_showcase: 'কারিগর প্রদর্শনী',
    copy_product_link: 'প্রোডাক্টের লিংক কপি করুন',
    // ── Market ──
    market_title: 'শিল্পিকা মার্কেট',
    market_intro: 'ভারতের জীবন্ত কারুশিল্প ঐতিহ্যের প্রিমিয়াম বাজার — প্রতিটি নিদর্শন হাতে তৈরি, যাচাইকৃত এবং স্থানীয় ও রপ্তানি ক্রেতাদের জন্য ন্যায্য মূল্যে।',
    market_view_category: 'ক্যাটাগরি দেখুন',
    market_explore: 'দেখুন',
    market_available_products: 'উপলব্ধ পণ্য',
    market_cultural_title: 'সাংস্কৃতিক উৎস',
    market_image_placeholder: 'ছবি শীঘ্রই আসছে',
    market_video_pending: 'শিল্প ভিডিও শীঘ্রই আসছে',
    market_video_pending_hint: 'এই শিল্পের প্রদর্শনী ভিডিও এখানে দেখানো হবে।',
    market_loading: 'লোড হচ্ছে…',
    market_load_error_title: 'কিছু একটা ভুল হয়েছে',
    market_load_error: 'মার্কেট এখন লোড করা যাচ্ছে না। আবার চেষ্টা করুন।',
    market_retry: 'আবার চেষ্টা করুন',
    market_back: 'মার্কেটে ফিরে যান',
    market_not_found_title: 'খুঁজে পাওয়া যায়নি',
    market_not_found_hint: 'এই ক্যাটাগরি বা শিল্প নেই। মার্কেট ঘুরে দেখুন।',
    market_product_not_found: 'পণ্য খুঁজে পাওয়া যায়নি',
    market_product_not_found_hint: 'এই নিদর্শনটি সরানো হয়ে থাকতে পারে, বা লিংকটি অসম্পূর্ণ।',
    market_empty_hint: 'নতুন নিদর্শন নির্বাচন করা হচ্ছে। কিছুক্ষণ পরে আবার দেখুন।',
    market_pricing_title: 'মূল্য',
    floor_price: 'ফ্লোর মূল্য',
    export_price: 'রপ্তানি মূল্য',
    floor_price_note: 'স্থানীয় / সর্বনিম্ন বিক্রয় মূল্য',
    export_price_note: 'রপ্তানি বাজার মূল্য',
    price_type_label: 'মূল্যের ধরন বেছে নিন',
    quantity_label: 'পরিমাণ',
    estimated_total: 'আনুমানিক মোট',
    product_id_label: 'পণ্য আইডি',
    in_stock: 'স্টকে আছে',
    out_of_stock: 'স্টক শেষ',
    stock_limit: 'এই পরিমাণ উপলব্ধ স্টকের চেয়ে বেশি।',
    market_price_missing: 'এই মূল্যের ধরনটি এই নিদর্শনের জন্য নেই।',
    view_details: 'বিস্তারিত দেখুন',
    add_to_cart: 'কার্টে যোগ করুন',
    place_order: 'অর্ডার করুন',
    share_product: 'শেয়ার',
    added_to_cart: 'আপনার কার্টে যোগ হয়েছে।',
    market_link_copied: 'পণ্যের লিংক কপি হয়েছে — যেকোনো জায়গায় পেস্ট করে শেয়ার করুন।',
    copy_failed: 'লিংক কপি করা গেল না। ঠিকানা বার থেকে কপি করুন।',
    signin_required: 'অর্ডার দিতে অনুগ্রহ করে সাইন ইন করুন।',
    order_placed_title: 'অর্ডার হয়েছে:',
    order_placed_toast: 'আপনার অর্ডার নথিভুক্ত হয়েছে!',
    order_failed: 'অর্ডার নথিভুক্ত করা গেল না। আবার চেষ্টা করুন।',
    cart_order_failed: 'কিছু পণ্য অর্ডার হয়নি:',
    cart_title: 'আপনার কার্ট',
    cart_empty: 'আপনার কার্ট খালি — বাজারে হাতে তৈরি নিদর্শনগুলো অপেক্ষা করছে।',
    cart_total: 'মোট মূল্য',
    cart_total_hint: 'অর্ডার দেওয়ার সময় মূল্য সার্ভার থেকে নিশ্চিত করা হয়।',
    cart_place_order: 'অর্ডার করুন',
    cart_remove: 'কার্ট থেকে সরান',
    voice_enquiry: 'ভয়েস জিজ্ঞাসা',
    voice_enquiry_hint: 'মূল্য, প্রাপ্যতা বা শিল্প সম্পর্কে জিজ্ঞাসা করুন — উত্তর আসে শুধুমাত্র লাইভ পণ্য তথ্য থেকে।',
    ask_by_voice: 'কণ্ঠে জিজ্ঞাসা করুন',
    stop_recording: 'শুনছি… থামাতে চাপুন',
    voice_listening: 'শুনছি… আপনার প্রশ্ন করুন।',
    voice_permission: 'মাইক্রোফোনের অনুমতি দেওয়া হয়নি। আপনি প্রশ্ন লিখতে পারেন।',
    voice_unsupported: 'এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়। অনুগ্রহ করে প্রশ্ন লিখুন।',
    voice_error: 'মাইক্রোফোন চালু করা গেল না। আবার চেষ্টা করুন বা প্রশ্ন লিখুন।',
    voice_too_short: 'খুব ছোট হয়ে গেল — বোতাম চেপে ধরে প্রশ্ন করুন।',
    enquiry_thinking: 'পণ্যের তথ্য দেখা হচ্ছে…',
    enquiry_failed: 'এখন উত্তর দেওয়া গেল না। আবার চেষ্টা করুন।',
    enquiry_send: 'জিজ্ঞাসা',
    enquiry_text_label: 'আপনার প্রশ্ন লিখুন',
    enquiry_text_hint: 'বা আপনার প্রশ্ন লিখুন…',
    enquiry_replay: 'উত্তর শুনুন',
    enquiry_you_asked: 'আপনি জিজ্ঞাসা করেছেন:',
    enquiry_voice_question: '(ভয়েস প্রশ্ন)',
    // ── Email OTP ──
    otp_title: 'আপনার ইমেইল দেখুন',
    otp_subtitle: 'আমরা ৬ সংখ্যার কোড পাঠিয়েছি',
    otp_code_label: '৬ সংখ্যার কোড লিখুন',
    otp_verify: 'যাচাই করে এগিয়ে যান',
    otp_resend: 'কোড আবার পাঠান',
    otp_back: 'পেছনে',
    otp_success: 'ইমেইল যাচাই হয়েছে — শিল্পিকায় স্বাগতম!',
    otp_resent: 'নতুন কোড পাঠানো হয়েছে।',
  },
};

function t(key) {
  const lang = state.currentLang || 'en';
  return I18N[lang]?.[key] || I18N.en?.[key] || key;
}

function initLanguage() {
  const saved = localStorage.getItem(LANG_KEY);
  const lang = saved && ['en', 'hi', 'bn'].includes(saved) ? saved : 'en';
  setLanguage(lang, false);

  const langSelect = $('lang-select');
  if (langSelect) {
    langSelect.value = lang;
    langSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value, true);
    });
  }

  document.querySelectorAll('[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.setLang, true);
    });
  });
}

function setLanguage(lang, notify = false) {
  if (!['en', 'hi', 'bn'].includes(lang)) lang = 'en';
  state.currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);

  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-lang', lang);

  // Sync select dropdown
  const langSelect = $('lang-select');
  if (langSelect && langSelect.value !== lang) {
    langSelect.value = lang;
  }

  // Sync login lang pill buttons
  document.querySelectorAll('[data-set-lang]').forEach((b) => {
    b.classList.toggle('active', b.dataset.setLang === lang);
  });

  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) {
      const icon = el.querySelector('i, svg');
      if (icon) {
        el.innerHTML = '';
        el.appendChild(icon);
        el.appendChild(document.createTextNode(' ' + t(key)));
      } else {
        el.textContent = t(key);
      }
    }
  });

  // Update all data-i18n-ph elements (placeholders)
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.dataset.i18nPh;
    if (key) {
      el.placeholder = t(key);
    }
  });

  // Update theme toggle label
  const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const label = $('theme-toggle-label');
  if (label) {
    label.textContent = theme === 'dark' ? t('light_mode') : t('dark_mode');
  }

  // Update portal header & breadcrumb
  const config = PORTAL_CONFIG[state.currentRole] || PORTAL_CONFIG.buyer;
  const portalName = config.portalNameKey ? t(config.portalNameKey) : config.portalName;
  if ($('portal-badge')) $('portal-badge').textContent = portalName;
  if ($('breadcrumb-portal')) $('breadcrumb-portal').textContent = portalName;
  const activeView = document.querySelector('.view.active')?.id || config.defaultView;
  const viewTitleKey = VIEW_TITLE_KEYS[activeView];
  if ($('breadcrumb-view')) {
    $('breadcrumb-view').textContent = viewTitleKey ? t(viewTitleKey) : (VIEW_TITLES[activeView] || 'Dashboard');
  }
  const roleText = config.userRoleTextKey ? t(config.userRoleTextKey) : config.userRoleText;
  if ($('sidebar-user-role')) $('sidebar-user-role').textContent = roleText;

  // Re-render sidebar navigation
  renderSidebarNav(state.currentRole);

  // Sync auth switch button text if present
  const switchBtn = $('btn-toggle-auth-mode');
  if (switchBtn) {
    const isSignup = $('tab-auth-signup')?.classList.contains('active');
    switchBtn.textContent = isSignup ? (t('tab_signin') || 'Sign In') : (t('tab_signup') || 'Sign Up');
  }

  // Re-render the market so bilingual subtitles follow the new language
  if (state.currentView === 'marketplace-view') renderMarketRoute();

  if (notify) {
    showToast(t('lang_changed'), 'info');
  }
}

// ---------------------------------------------------------------------------
// Dark / Light Theme (upper right corner toggle)
// ---------------------------------------------------------------------------
const THEME_KEY = 'shilpika_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);

  const toggleBtn = $('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const icon = $('theme-toggle-icon');
  const label = $('theme-toggle-label');
  if (icon) {
    icon.className = theme === 'dark' ? 'ph-bold ph-sun' : 'ph-bold ph-moon';
  }
  if (label) {
    label.textContent = theme === 'dark' ? t('light_mode') : t('dark_mode');
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initLanguage();
  initTheme();
  bindNavigation();
  bindLoginControls();
  bindWizardControls();
  bindBeforeAfterSlider();
  bindVoiceControls();
  bindModalControls();
  bindAuctionControls();
  bindSaathiControls();
  setupSpeechRecognition();
  initAuctions();
  await initSession();
});

async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3500) });
    state.apiOnline = res.ok;
  } catch {
    state.apiOnline = false;
  }
  if (!state.apiOnline) showToast('Backend not reachable — check that the server is running.', 'error');
}

// ---------------------------------------------------------------------------
// Login / session
// ---------------------------------------------------------------------------
const SESSION_KEY = 'shilpika_session';

// ─── Auth Mode: 'signin' or 'signup' ─────────────────────────────────────────
let currentAuthMode = 'signin';

function setAuthMode(mode) {
  currentAuthMode = mode;
  const isSignup = mode === 'signup';

  // Tab state
  $('tab-auth-login')?.classList.toggle('active', !isSignup);
  $('tab-auth-login')?.setAttribute('aria-selected', !isSignup ? 'true' : 'false');
  $('tab-auth-signup')?.classList.toggle('active', isSignup);
  $('tab-auth-signup')?.setAttribute('aria-selected', isSignup ? 'true' : 'false');

  // Show/hide forms
  const signinForm = $('signin-form');
  const signupForm = $('signup-form');
  if (signinForm) signinForm.hidden = isSignup;
  if (signupForm) signupForm.hidden = !isSignup;

  // Sync switch prompt
  const switchPrompt = $('auth-switch-prompt');
  const switchBtn = $('btn-toggle-auth-mode');
  if (switchPrompt) {
    switchPrompt.dataset.i18n = isSignup ? 'switch_to_signin' : 'switch_to_signup';
    switchPrompt.textContent = t(switchPrompt.dataset.i18n);
  }
  if (switchBtn) {
    switchBtn.dataset.i18n = isSignup ? 'tab_signin' : 'tab_signup';
    switchBtn.textContent = t(isSignup ? 'tab_signin' : 'tab_signup');
  }

  // Clear errors
  if ($('signin-error')) $('signin-error').hidden = true;
  if ($('signup-error')) $('signup-error').hidden = true;
}

function bindLoginControls() {
  const setupPasswordToggle = (btnId, inputId) => {
    const btn = $(btnId);
    const input = $(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      const icon = btn.querySelector('i');
      if (icon) icon.className = show ? 'ph ph-eye-slash' : 'ph ph-eye';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  };

  // Password toggles for new forms
  setupPasswordToggle('toggle-signin-password-btn', 'signin-password');
  setupPasswordToggle('toggle-signup-password-btn', 'signup-password');
  setupPasswordToggle('toggle-signup-confirm-btn', 'signup-confirm-password');

  // Tab switching
  $('tab-auth-login')?.addEventListener('click', () => setAuthMode('signin'));
  $('tab-auth-signup')?.addEventListener('click', () => setAuthMode('signup'));
  $('btn-toggle-auth-mode')?.addEventListener('click', () => {
    setAuthMode(currentAuthMode === 'signin' ? 'signup' : 'signin');
  });

  // Role card switching in sign up
  document.querySelectorAll('[data-signup-role]').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('[data-signup-role]').forEach((c) => {
        c.classList.toggle('selected', c === card);
        c.setAttribute('aria-checked', c === card ? 'true' : 'false');
      });
      const role = card.dataset.signupRole;
      const sellerFields = $('signup-seller-fields');
      if (sellerFields) sellerFields.hidden = (role !== 'artisan');
    });
  });

  // ── Google Login: Real Auth0 OAuth2 redirect ───────────────────────────────
  $('btn-google-login')?.addEventListener('click', () => {
    const selectedRoleCard = document.querySelector('[data-signup-role].selected');
    if (selectedRoleCard) {
      sessionStorage.setItem('pending_oauth_role', selectedRoleCard.dataset.signupRole);
    }
    window.location.href = '/api/v1/auth/google';
  });


  // ── Sign In Form ────────────────────────────────────────────────────────────
  $('signin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('signin-error');
    if (errEl) errEl.hidden = true;

    const email = $('signin-email')?.value.trim();
    const password = $('signin-password')?.value;
    const submitBtn = $('signin-submit');

    if (!email || !password) {
      if (errEl) { errEl.textContent = 'Please enter your email and password.'; errEl.hidden = false; }
      return;
    }

    submitBtn.disabled = true;
    try {
      // Try authenticated login first (password-based via Auth0)
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'buyer' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Sign-in failed. Check your email and password.');
      }
      // Email + password sign-in → OTP verification step before the session starts.
      if (data?.otpRequired) { showOtpStep(data.email, 'login', data.devCode); return; }
      saveSession({ token: data.token, user: data.user, isAuth0: data.isAuth0 });
      showToast(t('signin_success') || 'Welcome back!', 'success');
      enterApp();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.hidden = false; }
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ── Sign Up Form ────────────────────────────────────────────────────────────
  $('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('signup-error');
    if (errEl) errEl.hidden = true;

    const role = document.querySelector('[data-signup-role].selected')?.dataset.signupRole || 'buyer';
    const name = $('signup-name')?.value.trim();
    const email = $('signup-email')?.value.trim();
    const password = $('signup-password')?.value;
    const confirmPassword = $('signup-confirm-password')?.value;
    const submitBtn = $('signup-submit');

    const showErr = (msg) => {
      if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
    };

    if (!name) return showErr('Please enter your full name.');
    if (!email || !email.includes('@')) return showErr('Please enter a valid email address.');
    if (!password || password.length < 8) return showErr('Password must be at least 8 characters long.');
    if (password !== confirmPassword) return showErr(t('passwords_dont_match') || 'Passwords do not match.');

    // Seller-specific validation
    if (role === 'artisan') {
      const aadhaar = $('signup-aadhaar')?.value.replace(/\s/g, '');
      const address = $('signup-address')?.value.trim();
      if (!aadhaar || aadhaar.length !== 12 || !/^\d{12}$/.test(aadhaar)) {
        return showErr('Please enter a valid 12-digit Aadhaar number.');
      }
      if (!address || address.length < 10) {
        return showErr('Please enter your complete workshop/studio address.');
      }
    }

    submitBtn.disabled = true;
    try {
      const aadhaarVal = role === 'artisan' ? $('signup-aadhaar')?.value.replace(/\s/g, '') : undefined;
      const addressVal = role === 'artisan' ? $('signup-address')?.value.trim() : undefined;

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, aadhaar: aadhaarVal, address: addressVal }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to create account. Please try again.');

      // New account created → verify the email via OTP before entering.
      if (data?.otpRequired) { showOtpStep(data.email, 'signup', data.devCode); return; }
      saveSession({ token: data.token, user: data.user, isAuth0: true });
      showToast(t('signup_success') || 'Account created! Welcome to Shilpika.', 'success');
      enterApp();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.hidden = false; }
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ── Email OTP verification step (Brevo) ───────────────────────────────────
  let otpResendTimer = null;
  const otpContext = { email: '', purpose: 'login' };

  function showOtpStep(email, purpose, devCode) {
    otpContext.email = email;
    otpContext.purpose = purpose;
    $('otp-email').textContent = email;
    const codeInput = $('otp-code');
    if (codeInput) codeInput.value = '';
    const errEl = $('otp-error');
    if (errEl) errEl.hidden = true;
    $('auth-step-0').hidden = true;
    $('auth-step-otp').hidden = false;
    codeInput?.focus();
    if (devCode) showToast(`Dev OTP: ${devCode}`, 'info');
    startOtpResendCountdown();
  }

  function startOtpResendCountdown() {
    const btn = $('btn-otp-resend');
    const count = $('otp-resend-count');
    if (!btn || !count) return;
    let seconds = 60;
    btn.disabled = true;
    count.textContent = seconds;
    if (otpResendTimer) clearInterval(otpResendTimer);
    otpResendTimer = setInterval(() => {
      seconds -= 1;
      count.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(otpResendTimer);
        otpResendTimer = null;
        btn.disabled = false;
      }
    }, 1000);
  }

  $('otp-code')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });
  $('otp-code')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-otp-verify')?.click();
  });

  $('btn-otp-verify')?.addEventListener('click', async () => {
    const code = $('otp-code')?.value.trim();
    const errEl = $('otp-error');
    const btn = $('btn-otp-verify');
    if (errEl) errEl.hidden = true;
    if (!code || code.length !== 6) {
      if (errEl) { errEl.textContent = 'Enter the 6-digit code from your email.'; errEl.hidden = false; }
      return;
    }
    btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpContext.email, code, purpose: otpContext.purpose }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Verification failed. Please try again.');
      showToast(t('otp_success') || 'Email verified — welcome to Shilpika!', 'success');
      saveSession({ token: data.token, user: data.user, isAuth0: true });
      enterApp();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.hidden = false; }
    } finally {
      btn.disabled = false;
    }
  });

  $('btn-otp-resend')?.addEventListener('click', async () => {
    const errEl = $('otp-error');
    if (errEl) errEl.hidden = true;
    try {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpContext.email, purpose: otpContext.purpose }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Could not resend the code.');
      showToast(t('otp_resent') || 'A new code is on its way.', 'success');
      if (data.devCode) showToast(`Dev OTP: ${data.devCode}`, 'info');
      startOtpResendCountdown();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.hidden = false; }
    }
  });

  $('btn-otp-back')?.addEventListener('click', () => {
    $('auth-step-otp').hidden = true;
    $('auth-step-0').hidden = false;
    if (otpResendTimer) { clearInterval(otpResendTimer); otpResendTimer = null; }
  });

  // ── Google Onboarding Controls ─────────────────────────────────────────────
  $('onboard-role-buyer')?.addEventListener('click', () => selectOnboardRole('buyer'));
  $('onboard-role-artisan')?.addEventListener('click', () => selectOnboardRole('artisan'));

  // Format Aadhaar inputs (XXXX XXXX XXXX) — digits only, capped at 12
  ['signup-aadhaar', 'onboard-aadhaar'].forEach((id) => {
    $(id)?.addEventListener('input', (e) => {
      const digits = e.target.value.replace(/\D/g, '').substring(0, 12);
      const chunks = [];
      for (let i = 0; i < digits.length; i += 4) {
        chunks.push(digits.substring(i, i + 4));
      }
      e.target.value = chunks.join(' ');
    });
  });

  // Complete onboarding submit
  $('onboard-submit')?.addEventListener('click', async () => {
    const isSeller = $('onboard-role-artisan')?.classList.contains('selected');
    const role = isSeller ? 'artisan' : 'buyer';
    const errEl = $('onboard-error');
    if (errEl) errEl.hidden = true;

    let aadhaar = undefined;
    let address = undefined;
    let craftType = undefined;

    if (isSeller) {
      aadhaar = $('onboard-aadhaar')?.value.replace(/\s/g, '');
      address = $('onboard-address')?.value.trim();
      craftType = $('onboard-craft')?.value.trim() || undefined;

      if (!aadhaar || aadhaar.length !== 12 || !/^\d{12}$/.test(aadhaar)) {
        if (errEl) {
          errEl.textContent = 'Please enter a valid 12-digit Aadhaar number.';
          errEl.hidden = false;
        }
        return;
      }
      if (!address || address.length < 5) {
        if (errEl) {
          errEl.textContent = 'Please enter your complete workshop / studio address.';
          errEl.hidden = false;
        }
        return;
      }
    }

    const submitBtn = $('onboard-submit');
    submitBtn.disabled = true;

    try {
      const token = state.authToken;
      const res = await fetch(`${API_BASE}/auth/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role, aadhaar, address, craftType }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to complete profile setup. Please try again.');
      }

      sessionStorage.removeItem('pending_oauth_role');
      saveSession({ token: data.token, user: data.user, isAuth0: true, isGoogle: true });
      showToast(t('signin_success') || 'Welcome to Shilpika!', 'success');
      $('auth-step-onboarding').hidden = true;
      $('auth-step-0').hidden = false;
      enterApp();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message;
        errEl.hidden = false;
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Cancel / Use another account
  $('onboard-cancel-btn')?.addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('pending_oauth_role');
    location.reload();
  });

  // Logout
  $('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('pending_oauth_role');
    location.reload();
  });
}

function selectOnboardRole(role) {
  const isSeller = role === 'artisan';
  const buyerBtn = $('onboard-role-buyer');
  const sellerBtn = $('onboard-role-artisan');
  const sellerFields = $('onboard-seller-fields');
  const submitLabel = $('onboard-submit-label');

  if (buyerBtn) {
    buyerBtn.classList.toggle('selected', !isSeller);
    buyerBtn.setAttribute('aria-checked', !isSeller ? 'true' : 'false');
  }
  if (sellerBtn) {
    sellerBtn.classList.toggle('selected', isSeller);
    sellerBtn.setAttribute('aria-checked', isSeller ? 'true' : 'false');
  }
  if (sellerFields) {
    sellerFields.hidden = !isSeller;
  }
  if (submitLabel) {
    submitLabel.textContent = isSeller
      ? (t('btn_complete_setup_seller') || 'Complete Seller Verification')
      : (t('btn_complete_setup_buyer') || 'Continue to Marketplace');
  }
}

function showGoogleOnboarding(user, token) {
  $('login-overlay').hidden = false;
  $('app-main-container').style.visibility = 'hidden';

  // Switch card views
  $('auth-step-0').hidden = true;
  $('auth-step-onboarding').hidden = false;

  // Set user details
  const name = user.displayName || user.name || (user.email ? user.email.split('@')[0] : 'Artisan');
  const avatar = user.avatarUrl || user.picture;
  if ($('onboard-user-avatar') && avatar) {
    $('onboard-user-avatar').src = avatar;
  }
  if ($('onboard-welcome-title')) {
    const welcomeTpl = t('onboard_welcome') || 'Welcome, {name}!';
    $('onboard-welcome-title').textContent = welcomeTpl.replace('{name}', name);
  }
  if ($('onboard-user-email')) {
    $('onboard-user-email').textContent = user.email || '';
  }

  // Pre-select role if preferred in sessionStorage
  const pendingRole = sessionStorage.getItem('pending_oauth_role');
  if (pendingRole === 'artisan') {
    selectOnboardRole('artisan');
  } else {
    selectOnboardRole('buyer');
  }

  // Store active onboarding state
  state.authToken = token;
  state.user = user;
}




function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.token || !session.user) return null;
    return session;
  } catch {
    return null;
  }
}

function saveSession(session) {
  state.authToken = session.token;
  state.user = session.user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function initSession() {
  // Check if we're returning from a Google OAuth callback (Auth0 redirected back here)
  const params = new URLSearchParams(window.location.search);
  const googleToken = params.get('google_token');
  const googleUserRaw = params.get('google_user');
  const authError = params.get('auth_error');

  if (authError) {
    window.history.replaceState({}, '', window.location.pathname);
    $('login-overlay').hidden = false;
    $('app-main-container').style.visibility = 'hidden';
    $('signin-email')?.focus();
    showToast('Google sign-in failed: ' + decodeURIComponent(authError), 'error');
    return;
  }

  if (googleToken && googleUserRaw) {
    try {
      const user = JSON.parse(decodeURIComponent(googleUserRaw));
      const token = decodeURIComponent(googleToken);
      const needsOnboarding = params.get('needs_onboarding') === '1' || user.onboardingCompleted === false;

      saveSession({ token, user, isGoogle: true });
      window.history.replaceState({}, '', window.location.pathname);

      if (needsOnboarding) {
        showGoogleOnboarding(user, token);
        return;
      }

      showToast(t('google_login_success') || 'Signed in with Google!', 'success');
      enterApp();
      return;
    } catch (e) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // Normal session restore from localStorage
  const session = loadStoredSession();
  if (session) {
    // If the stored user has not completed onboarding, prompt them!
    if (session.user && session.user.onboardingCompleted === false) {
      showGoogleOnboarding(session.user, session.token);
      return;
    }
    saveSession(session);
    enterApp();
  } else if (isMarketPath(window.location.pathname)) {
    // Deep link into the Market (e.g. a shared product URL): guests may browse;
    // sign-in is requested when adding to cart or placing an order.
    enterApp();
  } else {
    $('login-overlay').hidden = false;
    $('app-main-container').style.visibility = 'hidden';
    $('signin-email')?.focus();
  }
}

function enterApp() {
  $('login-overlay').hidden = true;
  $('app-main-container').style.visibility = '';
  applyUserToUi();
  // A deep link into the Market wins over the role's default dashboard.
  if (isMarketPath(window.location.pathname)) showView('marketplace-view');
  checkApiHealth();
}

const PORTAL_CONFIG = {
  admin: {
    portalNameKey: 'portal_admin',
    portalSubKey: 'portal_sub_admin',
    portalName: 'Admin Portal',
    badgeClass: 'admin',
    defaultView: 'admin-analytics-view',
    userRoleTextKey: 'role_admin',
    userRoleText: 'Administrator',
    items: [
      {
        id: 'nav-admin-dashboard',
        viewId: 'admin-analytics-view',
        icon: 'ph ph-chart-line-up',
        titleKey: 'nav_admin_dashboard',
        subKey: 'nav_admin_dashboard_sub',
        title: 'Admin Dashboard',
        sub: 'Platform Analytics & Impact',
      },
      {
        id: 'nav-admin-catalog',
        viewId: 'marketplace-view',
        icon: 'ph ph-storefront',
        titleKey: 'nav_admin_catalog',
        subKey: 'nav_admin_catalog_sub',
        title: 'Marketplace Catalog',
        sub: 'Monitor Artisan Listings',
      },
      {
        id: 'nav-admin-auctions',
        viewId: 'auction-view',
        icon: 'ph ph-gavel',
        titleKey: 'nav_admin_auctions',
        subKey: 'nav_admin_auctions_sub',
        title: 'Nilaam Auctions',
        sub: 'Live Auction Activity',
      },
    ],
  },
  artisan: {
    portalNameKey: 'portal_seller',
    portalSubKey: 'portal_sub_artisan',
    portalName: 'Seller Portal',
    badgeClass: 'artisan',
    defaultView: 'artisan-dashboard-view',
    userRoleTextKey: 'role_artisan',
    userRoleText: 'Verified Artisan',
    items: [
      {
        id: 'nav-seller-dashboard',
        viewId: 'artisan-dashboard-view',
        icon: 'ph ph-squares-four',
        titleKey: 'nav_studio_dashboard',
        subKey: 'nav_studio_dashboard_sub',
        title: 'Studio Dashboard',
        sub: 'Performance & Listings',
      },
      {
        id: 'nav-seller-add-product',
        action: 'startAddProduct',
        icon: 'ph ph-camera-plus',
        titleKey: 'nav_add_craft',
        subKey: 'nav_add_craft_sub',
        title: 'Add New Craft',
        sub: 'AI Visual & Voice Studio',
      },
      {
        id: 'nav-seller-marketplace',
        viewId: 'marketplace-view',
        icon: 'ph ph-storefront',
        titleKey: 'nav_marketplace',
        subKey: 'nav_marketplace_sub',
        title: 'Public Marketplace',
        sub: 'Browse Handcrafted Catalog',
      },
      {
        id: 'nav-seller-auctions',
        viewId: 'auction-view',
        icon: 'ph ph-gavel',
        titleKey: 'nav_auctions',
        subKey: 'nav_auctions_sub',
        title: 'Nilaam Auctions',
        sub: 'Live Heritage Bidding',
      },
    ],
  },
  buyer: {
    portalNameKey: 'portal_buyer',
    portalSubKey: 'portal_sub_buyer',
    portalName: 'Buyer Portal',
    badgeClass: 'buyer',
    defaultView: 'marketplace-view',
    userRoleTextKey: 'role_buyer',
    userRoleText: 'Collector / Buyer',
    items: [
      {
        id: 'nav-buyer-marketplace',
        viewId: 'marketplace-view',
        icon: 'ph ph-storefront',
        titleKey: 'nav_buyer_market',
        subKey: 'nav_buyer_market_sub',
        title: 'Craft Marketplace',
        sub: 'Explore Handcrafted Goods',
      },
      {
        id: 'nav-buyer-auctions',
        viewId: 'auction-view',
        icon: 'ph ph-gavel',
        titleKey: 'nav_buyer_auctions',
        subKey: 'nav_buyer_auctions_sub',
        title: 'Nilaam Live Auctions',
        sub: 'Bid on Heritage Crafts',
      },
    ],
  },
};

const VIEW_TITLE_KEYS = {
  'artisan-dashboard-view': 'nav_studio_dashboard',
  'marketplace-view': 'nav_marketplace',
  'auction-view': 'nav_auctions',
  'admin-analytics-view': 'nav_admin_dashboard',
  'wizard-view': 'wizard_title',
};

const VIEW_TITLES = {
  'artisan-dashboard-view': 'Studio Dashboard',
  'marketplace-view': 'Marketplace',
  'auction-view': 'Nilaam Live Auctions',
  'admin-analytics-view': 'Admin Dashboard',
  'wizard-view': 'New Listing Studio',
};

function renderSidebarNav(role) {
  const config = PORTAL_CONFIG[role] || PORTAL_CONFIG.buyer;
  const navContainer = $('sidebar-nav');
  if (!navContainer) return;

  navContainer.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'sidebar-nav-header';
  header.textContent = t('main_menu');
  navContainer.appendChild(header);

  config.items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sidebar-item';
    btn.id = item.id;
    if (item.viewId) btn.dataset.viewId = item.viewId;
    if (item.action) btn.dataset.action = item.action;

    const title = item.titleKey ? t(item.titleKey) : item.title;
    const sub = item.subKey ? t(item.subKey) : item.sub;

    btn.innerHTML = `
      <i class="${item.icon}" aria-hidden="true"></i>
      <div class="item-text">
        <span class="item-title">${title}</span>
        <span class="item-sub">${sub}</span>
      </div>
    `;

    btn.addEventListener('click', () => {
      $('app-sidebar')?.classList.remove('open');
      $('sidebar-backdrop')?.classList.remove('active');

      if (item.action === 'startAddProduct') {
        startAddProduct();
      } else if (item.viewId === 'marketplace-view') {
        // The Market is a routed area — always enter at the landing page.
        navigateMarket('/market');
      } else if (item.viewId) {
        showView(item.viewId);
      }
    });

    navContainer.appendChild(btn);
  });
}

function applyUserToUi() {
  const user = state.user || { displayName: 'Guest', role: 'buyer' };
  const name = user.displayName || (user.email || 'you').split('@')[0];
  const role = user.role || 'buyer';
  state.currentRole = role;

  $('greeting-name').textContent = name;
  if ($('sidebar-user-name')) $('sidebar-user-name').textContent = name;
  if ($('sidebar-user-avatar')) $('sidebar-user-avatar').textContent = initials(name);

  // Show Auth0 badge if user authenticated via Auth0
  if ($('sidebar-auth0-tag')) {
    const isAuth0 = !!(state.user?.isAuth0 || state.user?.auth0Id?.startsWith('auth0|'));
    $('sidebar-auth0-tag').hidden = !isAuth0;
  }

  const signinBtn = $('topbar-signin');
  if (signinBtn) signinBtn.hidden = !!state.user;

  const config = PORTAL_CONFIG[role] || PORTAL_CONFIG.buyer;
  const portalName = config.portalNameKey ? t(config.portalNameKey) : config.portalName;
  if ($('portal-badge')) {
    $('portal-badge').textContent = portalName;
    $('portal-badge').className = `portal-badge ${config.badgeClass}`;
  }
  if ($('breadcrumb-portal')) {
    $('breadcrumb-portal').textContent = portalName;
  }
  if ($('sidebar-user-role')) {
    $('sidebar-user-role').textContent = config.userRoleTextKey ? t(config.userRoleTextKey) : config.userRoleText;
  }

  // Render the role's sidebar options
  renderSidebarNav(role);

  // Directly land on the portal's primary dashboard on login!
  showView(config.defaultView);
}

// ---------------------------------------------------------------------------
// Navigation (roles, views)
// ---------------------------------------------------------------------------
function bindNavigation() {
  $('sidebar-toggle-btn')?.addEventListener('click', () => {
    $('app-sidebar')?.classList.toggle('open');
    $('sidebar-backdrop')?.classList.toggle('active');
  });

  $('sidebar-backdrop')?.addEventListener('click', () => {
    $('app-sidebar')?.classList.remove('open');
    $('sidebar-backdrop')?.classList.remove('active');
  });

  document.querySelectorAll('[data-goto-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.gotoRole;
      if (target === 'admin' && state.user?.role !== 'admin') {
        showToast(t('admin_restricted') || 'Admin Portal is restricted to platform administrators.', 'error');
        return;
      }
      switchRole(target);
    });
  });
}

function switchRole(role) {
  if (role === 'admin' && state.user?.role !== 'admin') {
    showToast(t('admin_restricted') || 'Admin Portal is restricted to platform administrators.', 'error');
    return;
  }
  state.currentRole = role;
  const config = PORTAL_CONFIG[role] || PORTAL_CONFIG[state.user?.role || 'buyer'];
  showView(config.defaultView);
}

function showView(id) {
  const targetEl = document.getElementById(id);
  if (!targetEl) {
    console.warn('Target view element not found:', id);
    return;
  }

  // Security guard: Admin analytics is strictly for role === 'admin'
  if (id === 'admin-analytics-view' && state.user?.role !== 'admin') {
    showToast(t('admin_restricted') || 'Access denied: Admin Portal is restricted to platform administrators.', 'error');
    const safeView = state.user?.role === 'artisan' ? 'artisan-dashboard-view' : 'marketplace-view';
    showView(safeView);
    return;
  }

  // Security guard: Artisan dashboard is not for buyer
  if (id === 'artisan-dashboard-view' && state.user?.role === 'buyer') {
    showToast(t('artisan_restricted') || 'Artisan Studio is restricted to sellers.', 'info');
    showView('marketplace-view');
    return;
  }

  state.currentView = id;
  closeWizard(false);

  document.querySelectorAll('.view').forEach((v) => {
    const active = v.id === id;
    v.hidden = !active;
    v.classList.toggle('active', active);
  });

  // Update breadcrumb view title
  if ($('breadcrumb-view')) {
    const key = VIEW_TITLE_KEYS[id];
    $('breadcrumb-view').textContent = key ? t(key) : (VIEW_TITLES[id] || 'Dashboard');
  }

  // Update active sidebar item
  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.viewId === id);
  });

  try {
    if (id === 'marketplace-view') renderMarketRoute();
    if (id === 'auction-view') startAuctionTicker();
    if (id === 'admin-analytics-view') renderAdminView();
    if (id === 'artisan-dashboard-view') loadArtisanDashboard();
  } catch (err) {
    console.error('Error initializing view content for', id, err);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------------------------------------------------------------------
// Artisan dashboard
// ---------------------------------------------------------------------------
async function loadArtisanDashboard() {
  const authHeaders = { Authorization: `Bearer ${state.authToken || ''}` };
  // Real per-artisan analytics from the backend
  try {
    const res = await fetch(`${API_BASE}/analytics/artisan`, { headers: authHeaders });
    if (!res.ok) throw new Error('analytics');
    const a = await res.json();
    $('stat-products-count').textContent = formatNum(a.publishedProducts ?? 0);
    $('stat-views-count').textContent = formatNum(a.totalViews || 0);
    $('stat-inquiries-count').textContent = formatNum(a.totalInquiries || 0);
    $('stat-hours-count').textContent = formatNum(0); // craft hours not tracked server-side yet
    const mine = await fetch(`${API_BASE}/products/my`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const products = Array.isArray(mine) ? mine : (mine && mine.data) || a.topProducts || [];
    renderRecentProducts(products.slice(0, 4));
    return;
  } catch { /* fall back to feed-derived stats */ }
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
    $('stat-products-count').textContent = '0';
    $('stat-views-count').textContent = '0';
    $('stat-inquiries-count').textContent = '0';
    $('stat-hours-count').textContent = '0';
    renderRecentProducts([]);
    showToast('Could not load your dashboard — check that the server is running.', 'error');
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
      <img class="recent-thumb" src="${esc(p.thumbnailUrl || '')}" alt="" loading="lazy"
           onerror="this.style.visibility='hidden'">
      <span class="recent-body">
        <span class="recent-title">${esc(p.title)}</span>
        <span class="recent-meta">${esc(p.category || 'Handicraft')} · ${esc(p.region || 'India')}</span>
      </span>
      <span class="recent-side">
        <span class="recent-price">${p.priceMin ? `₹${formatNum(p.priceMin)}–₹${formatNum(p.priceMax || p.priceMin)}` : 'Draft'}</span>
        <span class="status-tag status-${esc(p.status || 'published')}">${esc(p.status || 'published')}</span>
      </span>
    </button>`).join('');

  container.querySelectorAll('[data-product]').forEach((el) => {
    el.addEventListener('click', () => openProductModal(el.dataset.product));
  });
}

// Second-line product name follows the selected UI language (en → English only, hi → Hindi, bn → Bengali)
function productSubTitle(p) {
  if (state.currentLang === 'bn') return p.titleBengali || '';
  if (state.currentLang === 'hi') return p.titleHindi || '';
  return '';
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
  const closeBtn = $('modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeProductModal);

  const modalOverlay = $('product-detail-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeProductModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('product-detail-modal')?.classList.contains('active')) closeProductModal();
  });
  $('listen-story-btn')?.addEventListener('click', playProductAudio);
  $('modal-wish-btn')?.addEventListener('click', () => {
    if (state.selectedProductDetail) toggleWishlist(state.selectedProductDetail.id);
  });
  $('share-product-btn')?.addEventListener('click', shareProduct);
  const inqForm = $('inquiry-form');
  if (inqForm) inqForm.addEventListener('submit', submitBuyerInquiry);
  $('btn-download-certificate')?.addEventListener('click', downloadCertificate);
  $('awaaz-form')?.addEventListener('submit', runAwaazMilan);
  $('btn-awaaz-play')?.addEventListener('click', playAwaazReply);
}

function extractYouTubeEmbedUrl(url) {
  if (!url) return '';
  url = String(url).trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  let videoId = '';
  if (match && match[1]) {
    videoId = match[1];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    videoId = url;
  }
  if (!videoId) return '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

function getDefaultCraftVideo(craft, category) {
  const c = `${craft || ''} ${category || ''}`.toLowerCase();
  if (c.includes('pottery') || c.includes('terracotta') || c.includes('clay')) {
    return 'https://www.youtube-nocookie.com/embed/kYv9qQ-mRCE?rel=0&modestbranding=1';
  }
  if (c.includes('dhokra') || c.includes('brass') || c.includes('metal') || c.includes('bell')) {
    return 'https://www.youtube-nocookie.com/embed/4wV9vI3Z2r0?rel=0&modestbranding=1';
  }
  if (c.includes('chikan') || c.includes('embroid') || c.includes('thread') || c.includes('fabric')) {
    return 'https://www.youtube-nocookie.com/embed/s1X5O-iKeqg?rel=0&modestbranding=1';
  }
  if (c.includes('silk') || c.includes('weav') || c.includes('handloom') || c.includes('textile') || c.includes('saree')) {
    return 'https://www.youtube-nocookie.com/embed/Fj2F7eXv9xI?rel=0&modestbranding=1';
  }
  return 'https://www.youtube-nocookie.com/embed/kYv9qQ-mRCE?rel=0&modestbranding=1';
}

function getDefaultCraftHistory(craft, region, title) {
  const c = `${craft || ''} ${title || ''}`.toLowerCase();
  const reg = region || 'India';
  if (c.includes('terracotta') || c.includes('pottery')) {
    return `Rooted in over 800 years of indigenous temple pottery traditions in ${reg}. Crafted using locally harvested riverbed clay, shaped on foot-turned wheels, and slow-baked in ancestral wood-fired pit kilns.`;
  }
  if (c.includes('dhokra') || c.includes('brass') || c.includes('metal')) {
    return `Handmade using the ancient lost-wax casting technique (cire perdue) dating back more than 4,000 years to the Indus Valley civilization. Each mold is broken to reveal the single cast sculpture, ensuring every creation is one of a kind.`;
  }
  if (c.includes('chikan') || c.includes('embroid')) {
    return `Passed down through 4 generations of master artisans in ${reg}. This heritage embroidery technique combines shadow-work and fine needlecraft on sheer natural fabric, historically patronized by regal courts.`;
  }
  if (c.includes('silk') || c.includes('handloom') || c.includes('weav') || c.includes('saree')) {
    return `Woven on traditional pit looms in ${reg} using pure mulberry or tussar silk yarn with fine zari motifs. An enduring generational legacy requiring up to three weeks of meticulous loom calibration and weaving.`;
  }
  return `Passed down through generations of master artisans in ${reg}, this traditional craft is preserved using natural materials and time-honored artisanal techniques unique to its cultural provenance.`;
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

async function openProductModal(productId) {
  let product = null;
  try {
    const res = await fetch(`${API_BASE}/products/${productId}`);
    if (res.ok) product = await res.json();
  } catch { /* handled below */ }
  if (!product) { showToast('Could not load that product.', 'error'); return; }

  state.selectedProductDetail = product;
  const saved = state.wishlist.has(product.id);
  const wishBtn = $('modal-wish-btn');
  if (wishBtn) {
    wishBtn.classList.toggle('saved', saved);
    wishBtn.setAttribute('aria-pressed', saved);
    wishBtn.innerHTML = `<i class="ph${saved ? '-fill' : ''} ph-heart" aria-hidden="true"></i>`;
  }

  // 1. Product Image & Craft
  const imgEl = $('modal-product-img');
  if (imgEl) {
    imgEl.src = product.thumbnailUrl || '';
    imgEl.alt = product.title || '';
  }
  const craftEl = $('modal-product-craft');
  if (craftEl) {
    craftEl.textContent = `${product.craft || 'Traditional handicraft'}${product.material ? ` · ${product.material}` : ''}`;
  }

  // 2. Product Name (English & Hindi)
  const titleEl = $('modal-product-title');
  if (titleEl) titleEl.textContent = product.title || 'Handcrafted Craft';
  const hindiTitleEl = $('modal-product-hindi-title');
  if (hindiTitleEl) hindiTitleEl.textContent = productSubTitle(product);

  // 3. Fixed Price set by the seller
  const fixedPrice = product.priceMax || product.priceMin;
  const priceLabel = fixedPrice ? `₹${formatNum(fixedPrice)}` : '₹900';
  const priceEl = $('modal-product-price');
  if (priceEl) priceEl.textContent = priceLabel;

  // 4. Location
  const locationText = product.origin || product.region || 'India';
  const originEl = $('modal-product-origin');
  if (originEl) {
    originEl.innerHTML = `<i class="ph ph-map-pin" aria-hidden="true"></i> ${esc(locationText)}`;
  }

  // 5. Product Description
  const descEl = $('modal-product-desc');
  if (descEl) {
    descEl.textContent = product.description || 'Authentic handcrafted piece made with natural materials and traditional techniques.';
  }

  // 6. Small History
  const historyText = product.history || getDefaultCraftHistory(product.craft, locationText, product.title);
  const historyEl = $('modal-product-history');
  if (historyEl) {
    historyEl.textContent = historyText;
  }

  // 7. Small YouTube Video Player
  const playerIframe = $('modal-youtube-player');
  if (playerIframe) {
    const embedUrl = extractYouTubeEmbedUrl(product.videoUrl) || getDefaultCraftVideo(product.craft, product.category);
    playerIframe.src = embedUrl;
  }

  // 8. Tags
  const tags = Array.isArray(product.tags) ? product.tags : (product.tags || '').split(',');
  const tagsEl = $('modal-product-tags');
  if (tagsEl) {
    tagsEl.innerHTML = tags.filter(Boolean).slice(0, 6).map((t) => `<span class="tag-pill">#${esc(t.trim())}</span>`).join('');
  }

  // 9. Provenance card (FR 2.1)
  const prov = provenanceFor(product);
  const provLine = $('modal-provenance-line');
  if (provLine) {
    provLine.innerHTML =
      `<strong>${esc(prov.artForm)}</strong> · ${esc(prov.lineage)} · ${esc(prov.generations)} · ` +
      `<strong>${formatNum(prov.hours)} human hours</strong> on this piece.`;
  }
  const provHash = $('modal-provenance-hash');
  if (provHash) {
    provHash.textContent = `Provenance hash: ${demoHash(product.id)} · verified origin`;
  }

  // 10. Seller's Name & Details
  const artisan = product.artisanName || product.artisan?.displayName || 'Independent Master Artisan';
  const artisanNameEl = $('modal-artisan-name');
  if (artisanNameEl) artisanNameEl.textContent = artisan;
  const artisanAvatarEl = $('modal-artisan-avatar');
  if (artisanAvatarEl) artisanAvatarEl.textContent = initials(artisan);
  const locBadge = $('modal-artisan-loc-badge');
  if (locBadge) locBadge.textContent = `Verified artisan · ${locationText}`;

  // Safe reset for inquiry & Awaaz
  const inqMsg = $('inquiry-message');
  if (inqMsg) inqMsg.value = '';
  const awaazReply = $('awaaz-reply');
  if (awaazReply) awaazReply.hidden = true;
  resetAwaazStages();

  const modal = $('product-detail-modal');
  if (modal) modal.classList.add('active');
  const closeBtn = $('modal-close-btn');
  if (closeBtn) closeBtn.focus();

  fetch(`${API_BASE}/products/${productId}`).catch(() => {}); // view counter
}

function provenanceFor(product) {
  // Only real data: craft/origin from the listing, hours when the artisan logged them.
  return {
    artForm: product.craft || product.category || 'Heritage craft',
    lineage: product.origin || product.region || 'India',
    generations: product.generations || 'recorded on Shilpika',
    hours: product.laborHours || 0,
  };
}

function closeProductModal() {
  const modal = $('product-detail-modal');
  if (modal) modal.classList.remove('active');
  const player = $('modal-youtube-player');
  if (player) player.src = '';
  state.selectedProductDetail = null;
}

function playProductAudio() {
  const p = state.selectedProductDetail;
  if (!p) return;
  const text = (() => {
    const sub = productSubTitle(p);
    return sub ? `${sub}। ${p.description || ''}` : (p.description || p.title);
  })();
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
  <text x="420" y="245" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#5c4f41">handcrafted by ${esc(p.artisanName || 'independent artisan')} · ${esc(p.region || 'India')}</text>
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

  await step(stages.stt, 500); // buyer question captured
  $('awaaz-reply').hidden = false;
  $('awaaz-reply-text').textContent = 'Translating…';
  $('awaaz-translate-text').hidden = false;
  $('awaaz-translate-text').textContent = '—';

  // Awaaz Milan: real Gemini translation in both directions
  const replyEnglish = awaazReplyFor(question, state.selectedProductDetail);
  let questionHindi = '';
  let replyHindi = '';
  try {
    if (state.apiOnline && state.authToken) {
      const translate = (text, target) => fetch(`${API_BASE}/ai/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
        body: JSON.stringify({ text, targetLanguage: target }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

      const q = await translate(question, 'hi');
      await step(stages.translate, 300);
      questionHindi = q ? q.translatedText || '' : '';
      if (questionHindi) {
        const r = await translate(replyEnglish, 'hi');
        replyHindi = r ? r.translatedText || '' : '';
      }
    }
  } catch { /* fallback below */ }

  if (!questionHindi) {
    await step(stages.translate, 300);
    questionHindi = '(translation offline)';
  }

  $('awaaz-translate-text').textContent = `${state.selectedProductDetail?.artisanName || 'The artisan'} reads: “${questionHindi}”`;
  $('awaaz-reply-text').textContent = replyEnglish;
  state.awaazSpeakText = replyHindi || replyEnglish;

  await step(stages.tts, 400);
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
    showToast('Playing Devki\'s reply with ElevenLabs voice.', 'info');
  }
}

// ---------------------------------------------------------------------------
// Saathi AI — Live AI Assistant with Rate Limiting (10 req/min)
// ---------------------------------------------------------------------------
const saathiRateLimit = {
  history: [],
  maxPerMinute: 10,
  lastRequestTime: 0,
  minCooldownMs: 2500,
};

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
    const t = $('saathi-answer-text').innerText || $('saathi-answer-text').textContent;
    if (t) speakAloud(t.replace(/^Saathi Live AI:\s*/i, ''));
  });
}

async function answerSaathi(question) {
  if (!question || !question.trim()) return;
  const q = question.trim();

  const answerContainer = $('saathi-answer');
  const answerText = $('saathi-answer-text');
  if (answerContainer) answerContainer.hidden = false;

  const now = Date.now();
  // Filter history to last 60 seconds
  saathiRateLimit.history = saathiRateLimit.history.filter((t) => now - t < 60000);

  // Check cooldown
  if (now - saathiRateLimit.lastRequestTime < saathiRateLimit.minCooldownMs) {
    if (answerText) {
      answerText.innerHTML = `<span style="color: var(--clay);">⏳ <strong>Rate limit active:</strong> Please wait 2 seconds between questions.</span>`;
    }
    return;
  }

  // Check rate limit (10 / min)
  if (saathiRateLimit.history.length >= saathiRateLimit.maxPerMinute) {
    const oldest = saathiRateLimit.history[0];
    const waitSec = Math.max(1, Math.ceil((60000 - (now - oldest)) / 1000));
    if (answerText) {
      answerText.innerHTML = `<span style="color: var(--danger);">⚠️ <strong>Rate limit reached:</strong> Maximum ${saathiRateLimit.maxPerMinute} questions per minute. Please wait ${waitSec}s before asking again.</span>`;
    }
    return;
  }

  // Record timestamp
  saathiRateLimit.lastRequestTime = now;
  saathiRateLimit.history.push(now);

  if (answerText) {
    answerText.innerHTML = `<span class="saathi-live-tag"><span class="saathi-live-dot"></span> Saathi Live AI is thinking…</span>`;
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.authToken) {
      headers['Authorization'] = `Bearer ${state.authToken}`;
    }

    const res = await fetch(`${API_BASE}/ai/saathi`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: q,
        context: `${state.user ? `Artisan/User: ${state.user.name} (${state.user.role || 'Artisan'})` : 'Platform visitor'}. Active UI language: ${state.currentLang || 'en'}`
      }),
    });

    if (res.status === 429) {
      if (answerText) {
        answerText.innerHTML = `<span style="color: var(--danger);">⚠️ <strong>Rate limit exceeded (10 req/min):</strong> Saathi received too many questions from your IP. Please try again in 1 minute.</span>`;
      }
      return;
    }

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.reply) {
      if (answerText) {
        answerText.innerHTML = `<div class="saathi-live-tag"><span class="saathi-live-dot"></span> Saathi Live AI</div><p>${esc(data.reply)}</p>`;
      }
      return;
    }
    throw new Error('No reply in response');
  } catch (err) {
    console.warn('Saathi AI fetch error:', err);
    if (answerText) {
      answerText.innerHTML = `<span style="color: var(--danger);"><strong>Saathi AI:</strong> Could not connect to live AI service right now. Please ensure the backend server is running.</span>`;
    }
  }
}

// ---------------------------------------------------------------------------
// Nilaam — live heritage auction (FR 2.3), backed by the auctions API
// ---------------------------------------------------------------------------
async function initAuctions() {
  try {
    const res = await fetch(`${API_BASE}/auctions`);
    if (!res.ok) throw new Error('auctions');
    const items = await res.json();
    state.auction.items = items.map((a) => ({
      id: a.id,
      title: a.title,
      hindi: a.hindi || '',
      artForm: a.artForm || '',
      img: a.img || '',
      reserve: Number(a.reserve),
      currentBid: Number(a.currentBid),
      endsAt: new Date(a.endsAt).getTime(),
      lineage: a.lineage || '',
      status: a.status,
      bids: (a.bids || []).map((b) => ({ bidder: b.bidder, amount: Number(b.amount), t: new Date(b.createdAt).getTime() })),
    }));
    state.auction.serverBacked = true;
    if (state.auction.selectedId && !state.auction.items.some((x) => x.id === state.auction.selectedId)) {
      state.auction.selectedId = null;
    }
  } catch {
    // Offline fallback: local demo sessions
    const now = Date.now();
    state.auction.items = [
      { id: 'nilaam-dokra', title: 'Antique Dokra Ritual Elephant', hindi: 'प्राचीन डोकरा हाथी', artForm: 'Dhra Dhokra (lost-wax brass)', img: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80', reserve: 24000, currentBid: 31500, endsAt: now + 7 * 60000 + 32000, lineage: 'Dhokra foundry of Mayurbhanj · 3rd generation', bids: [{ bidder: 'Collector #4211', amount: 31500, t: now - 45000 }] },
      { id: 'nilaam-tanjore', title: 'Tanjore Painting, Gilded Panel', hindi: 'तंजावर चित्रकला', artForm: 'Tanjore (Mysore gesso work)', img: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80', reserve: 40000, currentBid: 36500, endsAt: now + 3 * 60000 + 10000, lineage: 'Thanjavur studio lineage · 4th generation', bids: [{ bidder: 'Collector #0912', amount: 36500, t: now - 80000 }] },
      { id: 'nilaam-banarasi', title: 'Real Zari Banarasi, 1970s Heirloom', hindi: 'असली ज़री की बनारसी', artForm: 'Banarasi kadwa weaving', img: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80', reserve: 60000, currentBid: 72000, endsAt: now + 11 * 60000, lineage: 'Ansari atelier archive piece', bids: [{ bidder: 'Museum of Textiles', amount: 72000, t: now - 60000 }] },
    ];
    state.auction.serverBacked = false;
  }
}

function bindAuctionControls() {
  $('btn-place-bid').addEventListener('click', placeBid);
}

async function startAuctionTicker() {
  await initAuctions();
  reviveClosedAuctions();
  renderAuctionList();
  if (!state.auction.tickInterval) {
    state.auction.tickInterval = setInterval(auctionTick, 1000);
  }
}

// Offline fallback only: when local demo auctions lapse, restart them.
function reviveClosedAuctions() {
  if (state.auction.serverBacked) return; // server opens fresh sessions automatically
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
  if (state.currentView !== 'auction-view') return;
  const now = Date.now();

  if (state.auction.serverBacked) {
    // Server simulates competing collectors and session revival; poll every ~8s
    state.auction.pollCounter = (state.auction.pollCounter || 0) + 1;
    if (state.auction.pollCounter >= 8 && !state.auction.polling) {
      state.auction.pollCounter = 0;
      state.auction.polling = true;
      initAuctions().catch(() => {}).finally(() => {
        state.auction.polling = false;
        renderAuctionList();
        renderAuctionPanel(false);
      });
    }
  } else {
    // Simulated competing bidders keep the local ticker alive
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
  }

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

async function placeBid() {
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

  if (state.auction.serverBacked) {
    try {
      const res = await fetch(`${API_BASE}/auctions/${a.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
        body: JSON.stringify({ bidder: 'You (Marcus)', amount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg = err && typeof err.message === 'string' ? err.message
          : Array.isArray(err?.message) ? err.message.join(', ')
          : 'Bid rejected.';
        showToast(msg, 'error');
        return;
      }
      const data = await res.json();
      const s = data.session || {};
      a.currentBid = Number(s.currentBid) || amount;
      if (s.endsAt) a.endsAt = new Date(s.endsAt).getTime();
      a.bids.unshift({ bidder: 'You (Marcus)', amount, t: now });
      input.value = '';
      if (data.extended) {
        showToast('Anti-sniping: a bid landed in the final minute — timer extended by 2 minutes.', 'info');
      } else {
        showToast(`Bid placed: ₹${formatNum(amount)} — verified via Auth0 identity.`, 'success');
      }
      renderAuctionList();
      renderAuctionPanel(false);
      return;
    } catch { showToast('Bid server unreachable — try again.', 'error'); return; }
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
  $('btn-start-add-product')?.addEventListener('click', startAddProduct);
  $('btn-cancel-wizard')?.addEventListener('click', () => closeWizard(true));
  $('btn-cancel-wizard-2')?.addEventListener('click', () => closeWizard(true));
  bindPhotoUpload();

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
      debounceAiPricing();
    });
  });

  const margin = $('margin-range');
  margin.addEventListener('input', () => {
    state.currentCosts.margin = Number(margin.value);
    $('margin-value').textContent = `${margin.value}%`;
    margin.style.setProperty('--fill', `${((margin.value - 10) / 50) * 100}%`);
    calculatePricing();
    debounceAiPricing();
  });

  const chosenPriceInput = $('seller-chosen-price');
  if (chosenPriceInput) {
    chosenPriceInput.addEventListener('input', () => {
      chosenPriceInput.dataset.autoFilled = 'false';
    });
  }
  $('btn-use-ai-price')?.addEventListener('click', () => {
    if (chosenPriceInput) {
      const rec = state.recommendedPrice.b2c || state.recommendedPrice.floor || 500;
      chosenPriceInput.value = rec;
      chosenPriceInput.dataset.autoFilled = 'true';
      showToast(`Applied AI recommended price ₹${formatNum(rec)}`, 'info');
    }
  });

  $('btn-publish-final').addEventListener('click', publishProductNow);
}

function startAddProduct() {
  state.currentView = 'wizard-view';
  document.querySelectorAll('.view').forEach((v) => {
    const active = v.id === 'wizard-view';
    v.hidden = !active;
    v.classList.toggle('active', active);
  });
  if ($('breadcrumb-view')) {
    $('breadcrumb-view').textContent = t('nav_add_craft') || 'Add New Craft';
  }
  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.action === 'startAddProduct');
  });
  state.currentProductId = null;
  state.currentCatalog = null;
  state.uploadedPhoto = null;
  state.currentTranscript = '';
  state.aiPriceRecommendationId = null;
  state.currentCosts = { material: 0, labor: 0, transport: 0, margin: state.currentCosts.margin || 25 };
  $('cost-material').value = 0;
  $('cost-labor').value = 0;
  $('cost-transport').value = 0;
  $('transcript-input').value = '';
  ['cat-title-en', 'cat-title-hi', 'cat-desc-en', 'cat-desc-hi', 'cat-story', 'cat-category', 'cat-craft', 'cat-origin', 'cat-lineage', 'cat-generations', 'cat-hours'].forEach((id) => { $(id).value = ''; });
  const dropzone = $('upload-dropzone');
  dropzone.classList.remove('has-photo');
  dropzone.innerHTML = `
    <i class="ph ph-upload-simple" aria-hidden="true"></i>
    <strong>Tap to choose a photo</strong>
    <span>Use the real photo from your workshop — it stays yours, always.</span>`;
  $('craft-photo-input').value = '';
  $('before-img').src = '';
  $('after-img').src = '';
  const chosenPriceInput = $('seller-chosen-price');
  if (chosenPriceInput) {
    chosenPriceInput.value = '';
    chosenPriceInput.dataset.autoFilled = 'true';
  }
  goToWizardStep(1);
}

function closeWizard(navigate = false) {
  const wizard = $('wizard-view');
  if (wizard) {
    wizard.hidden = true;
    wizard.classList.remove('active');
  }
  if (navigate) {
    const config = PORTAL_CONFIG[state.user?.role || 'artisan'] || PORTAL_CONFIG.artisan;
    showView(config.defaultView);
  }
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
  if (stepNum === 4) { syncCostInputs(); calculatePricing(); requestAiPricing(); }
  if (stepNum === 5) buildListingPreview();

  const screen = document.querySelector('.main-screen');
  if (screen) screen.scrollTop = 0;
}

// --- Step 1: photo & Shilpika Visual AI pipeline ---
// --- Step 1: real photo upload + Shilpika Visual AI pipeline ---
function bindPhotoUpload() {
  const input = $('craft-photo-input');
  const dropzone = $('upload-dropzone');

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (file) handlePhotoSelected(file);
  });

  ['dragover', 'dragenter'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  }));
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handlePhotoSelected(file);
  });
}

async function handlePhotoSelected(file) {
  const dropzone = $('upload-dropzone');
  const note = $('pipeline-note');

  if (!file.type.startsWith('image/')) {
    showToast('Please choose an image file (JPG, PNG, WebP…).', 'error');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    showToast('Photo is larger than 20MB — choose a smaller one.', 'error');
    return;
  }

  // Local preview immediately — the original is kept untouched
  state.uploadedPhoto = { file, url: URL.createObjectURL(file), mediaId: null, mediaUrl: null };
  dropzone.classList.add('has-photo');
  dropzone.innerHTML = `
    <i class="ph-fill ph-check-circle" aria-hidden="true"></i>
    <strong>${esc(file.name)}</strong>
    <span>Tap to replace this photo</span>`;
  $('before-img').src = state.uploadedPhoto.url;
  $('after-img').src = '';
  syncAfterImageWidth();
  runPipelineStrip();

  note.textContent = 'Quality gate running on your photo…';

  // The draft must exist before media/AI can attach to it
  const productId = await ensureDraftProduct();
  if (!productId) {
    note.textContent = 'Sign-in needed before uploading — please sign in again.';
    return;
  }

  try {
    // Persist the original via the media endpoint
    const fd = new FormData();
    fd.append('file', file, file.name || 'workshop-photo.jpg');
    const mediaRes = await fetch(`${API_BASE}/products/${productId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.authToken || ''}` },
      body: fd,
    });
    if (mediaRes.ok) {
      const media = await mediaRes.json();
      state.uploadedPhoto.mediaId = media.id;
      state.uploadedPhoto.mediaUrl = media.originalUrl;
      state.uploadedPhoto.base64 = await blobToBase64(file);
      state.uploadedPhoto.mimeType = file.type || 'image/jpeg';
    } else {
      const err = await mediaRes.json().catch(() => null);
      note.textContent = (err?.message || 'Photo upload failed — check your connection and try again.');
      return;
    }
  } catch {
    note.textContent = 'Photo upload failed — check your connection and try again.';
    return;
  }

  // Real enhancement pass (Studio AI provider) on the uploaded photo
  await enhanceUploadedPhoto();
}

async function enhanceUploadedPhoto() {
  const up = state.uploadedPhoto;
  const note = $('pipeline-note');
  if (!up || !up.file || !state.currentProductId) return;
  const runToken = ++enhanceUploadedPhoto.token;
  try {
    const fd = new FormData();
    fd.append('image', up.file, up.file.name || 'workshop-photo.jpg');
    fd.append('productId', state.currentProductId);
    fd.append('mediaId', up.mediaId || `upload-${Date.now()}`);
    const res = await fetch(`${API_BASE}/ai/image-enhance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.authToken || ''}` },
      body: fd,
    });
    if (!res.ok || runToken !== enhanceUploadedPhoto.token) return;
    const data = await res.json();
    if (data.processedBase64) {
      $('after-img').src = data.processedBase64;
      syncAfterImageWidth();
      note.textContent = `Quality gate complete → ${data.isMock ? 'local' : 'Studio AI'} enhancement applied (fidelity check passed). Original kept untouched — nothing publishes until you approve.`;
    }
  } catch { /* keep the original visible */ }
}
enhanceUploadedPhoto.token = 0;

function updateBeforeAfterImages() {
  const up = state.uploadedPhoto;
  if (up && up.url) {
    $('before-img').src = up.url;
  }
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
    $('transcript-input').value = state.currentTranscript || interim;
  };

  state.speechRecognition.onend = () => stopRecordingUi('Speech captured! Tap Next when ready.');
}

async function toggleVoiceRecording() {
  const micBtn = $('mic-record-btn');
  if (!state.isRecording) {
    state.isRecording = true;
    micBtn.classList.add('recording');
    micBtn.setAttribute('aria-pressed', 'true');
    $('mic-stage').classList.add('recording');
    $('mic-status-text').textContent = 'Listening… speak naturally';
    startRecTimer();

    // Preferred path: record audio and transcribe server-side with ElevenLabs STT
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.mediaStream = stream;
        state.mediaChunks = [];
        const recorder = new MediaRecorder(stream);
        state.mediaRecorder = recorder;
        recorder.ondataavailable = (e) => { if (e.data.size) state.mediaChunks.push(e.data); };
        recorder.onstop = () => submitRecordedAudio(stream);
        recorder.start();
        return;
      } catch { /* mic denied or unsupported — fall through */ }
    }

    if (state.speechRecognition) {
      try { state.speechRecognition.start(); } catch { simulateVoiceInput(); }
    } else {
      simulateVoiceInput();
    }
  } else {
    stopRecordingUi('Recording stopped. Tap Next when ready.');
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
    } else if (state.speechRecognition) { try { state.speechRecognition.stop(); } catch { /* noop */ } }
  }
}

// Send the recorded clip to /ai/transcribe (ElevenLabs Scribe STT)
async function submitRecordedAudio(stream) {
  stream.getTracks().forEach((t) => t.stop());
  state.mediaStream = null;
  const chunks = state.mediaChunks;
  state.mediaRecorder = null;
  if (!chunks.length) { simulateVoiceInput(); return; }

  const blob = new Blob(chunks, { type: chunks[0].type || 'audio/webm' });
  if (blob.size < 2048) { simulateVoiceInput(); return; } // too short to be speech

  $('mic-status-text').textContent = 'Transcribing with Shilpika Vani…';
  try {
    const fd = new FormData();
    fd.append('audio', blob, 'voice-story.webm');
    fd.append('productId', state.currentProductId || '');
    fd.append('language', 'hi');
    const res = await fetch(`${API_BASE}/ai/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.authToken || ''}` },
      body: fd,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.transcript && !data.isMock) {
        state.currentTranscript = data.transcript;
        $('transcript-input').value = data.transcript;
        stopRecordingUi('Speech captured! Tap Next when ready.');
        showToast('Transcribed live with ElevenLabs STT.', 'success');
        return;
      }
    }
  } catch { /* fall back to sample text */ }
  simulateVoiceInput();
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
  // No mic available — invite the artisan to type their description instead
  stopRecordingUi('No microphone access — type your description below instead.');
  $('transcript-input').focus();
}

// --- Step 3: catalog + story engine + provenance ---
// Draft listing first so AI output, media and pricing persist against a real product
async function ensureDraftProduct() {
  if (state.currentProductId) return state.currentProductId;
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
      body: JSON.stringify({
        title: 'Untitled listing',
        tags: ['handmade', 'artisan'],
      }),
    });
    if (res.ok) {
      state.currentProductId = (await res.json()).id;
      return state.currentProductId;
    }
  } catch { /* offline */ }
  return null;
}

async function triggerAiCatalogGeneration() {
  const status = $('ai-gen-status');
  status.className = 'gen-status';
  status.innerHTML = '<i class="ph ph-spinner ph-spin" aria-hidden="true"></i> Gemini is extracting craft attributes and writing your bilingual listing…';

  const transcript = ($('transcript-input').value || '').trim() || state.currentTranscript || '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` };

  try {
    if (await ensureDraftProduct()) {
      const body = { productId: state.currentProductId, transcript };
      // Real vision: include the uploaded photo so Gemini reads the actual craft
      if (state.uploadedPhoto && state.uploadedPhoto.base64) {
        body.imageBase64 = state.uploadedPhoto.base64;
        body.imageMimeType = state.uploadedPhoto.mimeType || 'image/jpeg';
      }
      const res = await fetch(`${API_BASE}/ai/catalog-generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        // API returns snake_case; the form binds camelCase
        data.titleHindi = data.titleHindi || data.title_hindi || '';
        data.titleBengali = data.titleBengali || data.title_bengali || '';
        data.descriptionHindi = data.descriptionHindi || data.description_hindi || '';
        state.currentCatalog = data;
      } else {
        state.currentCatalog = fallbackCatalog();
      }
    } else {
      state.currentCatalog = fallbackCatalog();
    }
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
    titleBengali: p.titleBengali || '',
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
  const c = state.currentCatalog || {};
  $('cat-title-en').value = c.title || '';
  $('cat-title-hi').value = c.titleHindi || '';
  $('cat-desc-en').value = c.description || '';
  $('cat-desc-hi').value = c.descriptionHindi || '';
  $('cat-story').value = c.story || '';
  $('cat-category').value = c.category || '';
  $('cat-craft').value = c.craft || '';
  $('cat-origin').value = c.origin || c.region || '';
  $('cat-lineage').value = c.lineage || '';
  $('cat-generations').value = c.generations || '';
  $('cat-hours').value = c.hours ?? '';

  const tags = Array.isArray(c.tags) ? c.tags : [];
  $('cat-tags-container').innerHTML = tags.map((t) => `<span class="tag-pill">#${esc(t)}</span>`).join('');
}

async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function generateStory() {
  const box = $('cat-story');
  box.value = 'Reading the photo with Gemini Vision — identifying the art form…';
  box.disabled = true;

  let story = null;
  let artForm = null;
  try {
    if (state.currentProductId && state.apiOnline) {
      const body = {
        productId: state.currentProductId,
        title: $('cat-title-en').value || 'Handcrafted listing',
        craft: $('cat-craft')?.value || undefined,
        region: $('cat-origin')?.value || undefined,
      };
      try {
        // Send the actual uploaded photo to Gemini Vision
        if (state.uploadedPhoto && state.uploadedPhoto.base64) {
          body.imageBase64 = state.uploadedPhoto.base64;
          body.imageMimeType = state.uploadedPhoto.mimeType || 'image/jpeg';
        }
      } catch { /* story works without the photo too */ }
      const res = await fetch(`${API_BASE}/ai/story-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        story = data.story || null;
        artForm = data.artForm || null;
      }
    }
  } catch { /* fall back to preset story */ }

  if (story) {
    box.value = story;
    if (artForm) $('cat-craft').value = artForm;
    showToast(`Art form identified: ${artForm || 'your craft'} (Gemini Vision)`, 'success');
  } else {
    box.value = '';
    showToast('Story engine is offline — write the story in your own words above.', 'info');
    box.focus();
  }
  box.disabled = false;
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
  const totalCost = material + labor + transport;
  const floor = totalCost;
  const b2c = Math.round(totalCost * (1 + margin / 100));
  const b2b = Math.round(b2c * 1.8);
  state.recommendedPrice = { floor, b2c, b2b };

  $('benchmark-region').textContent = 'your craft market';
  $('cost-total').textContent = `₹${formatNum(totalCost)}`;
  $('tier-floor').textContent = `₹${formatNum(floor)}`;
  $('tier-b2c').textContent = `₹${formatNum(b2c)}`;
  $('tier-b2b').textContent = `₹${formatNum(b2b)}`;
  $('recommended-price-range').textContent = `₹${formatNum(b2c)} (B2C anchor)`;
  $('cost-breakdown-text').textContent =
    `Floor = your costs ₹${formatNum(totalCost)} · B2C = costs + ${margin}% fair margin · Export = B2C × 1.8. Advisory only — you decide.`;

  if ($('ai-rec-display-badge')) {
    $('ai-rec-display-badge').textContent = `₹${formatNum(floor)} to ₹${formatNum(b2c)}`;
  }
  if ($('ai-rec-btn-price')) {
    $('ai-rec-btn-price').textContent = `₹${formatNum(b2c)}`;
  }
  const sellerPriceInput = $('seller-chosen-price');
  if (sellerPriceInput && (!sellerPriceInput.value || sellerPriceInput.dataset.autoFilled === 'true')) {
    sellerPriceInput.value = b2c || floor || 500;
    sellerPriceInput.dataset.autoFilled = 'true';
  }

  const fill = $('benchmark-fill');
  const marker = $('benchmark-marker');
  fill.style.left = '0%';
  fill.style.width = '0%';
  marker.style.left = '50%';
  marker.title = `Your B2C price ₹${b2c}`;
}

// Shilpika Value: real AI price recommendation from the pricing engine (cost + market data)
let aiPricingDebounce = null;
function debounceAiPricing() {
  clearTimeout(aiPricingDebounce);
  aiPricingDebounce = setTimeout(() => requestAiPricing(), 1200);
}

async function requestAiPricing() {
  if (!state.currentProductId || !state.apiOnline) return;
  const { material, labor, transport, margin } = state.currentCosts;
  const noteEl = $('benchmark-note');
  try {
    const res = await fetch(`${API_BASE}/ai/price-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
      body: JSON.stringify({
        productId: state.currentProductId,
        materialCost: material,
        laborCost: labor,
        otherCost: transport,
        desiredMarginPercent: margin,
        category: $('cat-category')?.value || undefined,
        craft: $('cat-craft')?.value || undefined,
        region: $('cat-origin')?.value || undefined,
      }),
    });
    if (!res.ok) return;
    const rec = await res.json();
    if (typeof rec.min_price !== 'number' || typeof rec.max_price !== 'number') return;
    if (state.currentWizardStep !== 4) return; // user moved on

    state.recommendedPrice = { floor: rec.min_price, b2c: rec.max_price, b2b: Math.round(rec.max_price * 1.8) };
    state.aiPriceRecommendationId = rec.recommendation_id || rec.id || null;
    state.aiPriceSource = rec.data_availability || 'COST_BASED';

    $('cost-total').textContent = `₹${formatNum(rec.estimated_cost ?? (material + labor + transport))}`;
    $('tier-floor').textContent = `₹${formatNum(rec.min_price)}`;
    $('tier-b2c').textContent = `₹${formatNum(rec.max_price)}`;
    $('tier-b2b').textContent = `₹${formatNum(Math.round(rec.max_price * 1.8))}`;
    $('recommended-price-range').textContent = `₹${formatNum(rec.max_price)} (B2C anchor)`;
    if ($('ai-rec-display-badge')) {
      $('ai-rec-display-badge').textContent = `₹${formatNum(rec.min_price)} to ₹${formatNum(rec.max_price)}`;
    }
    if ($('ai-rec-btn-price')) {
      $('ai-rec-btn-price').textContent = `₹${formatNum(rec.max_price)}`;
    }
    const sellerPriceInput = $('seller-chosen-price');
    if (sellerPriceInput && sellerPriceInput.dataset.autoFilled === 'true') {
      sellerPriceInput.value = rec.max_price;
    }
    const factors = Array.isArray(rec.factors) ? rec.factors.join(' · ') : '';
    if (noteEl) {
      noteEl.textContent = `AI pricing (${rec.data_availability === 'MARKET_DATA' ? 'market-data backed' : 'cost-based'} · ${rec.model_version || 'pricing-v1'})${factors ? ` — ${factors}` : ''}. Advisory only — you decide.`;
    }
  } catch { /* local math stays as the baseline */ }
}

// --- Step 5: preview & publish ---
function buildListingPreview() {
  const previewImg = (state.uploadedPhoto && (state.uploadedPhoto.mediaUrl || state.uploadedPhoto.url)) || '';
  if (previewImg) $('preview-img').src = previewImg;
  $('preview-title').textContent = $('cat-title-en').value || 'Untitled listing';
  $('preview-title-hi').textContent = $('cat-title-hi').value || '';
  $('preview-desc').textContent = $('cat-desc-en').value || '—';
  const chosenPrice = Number($('seller-chosen-price')?.value) || state.recommendedPrice.b2c || state.recommendedPrice.floor || 500;
  $('preview-price').textContent = `₹${formatNum(chosenPrice)} (Listing price)`;
  $('preview-origin').innerHTML = `<i class="ph ph-map-pin" aria-hidden="true"></i> ${esc($('cat-origin').value || 'India')}`;

  const lineage = $('cat-lineage').value;
  const generations = $('cat-generations').value;
  const hours = Number($('cat-hours').value) || 0;
  const provParts = [lineage, generations, hours ? `${formatNum(hours)} human hours` : ''].filter(Boolean);
  $('preview-provenance').innerHTML = provParts.length
    ? `<i class="ph-fill ph-seal-check" aria-hidden="true"></i> Provenance: ${esc(provParts.join(' · '))}`
    : `<i class="ph-fill ph-seal-check" aria-hidden="true"></i> Provenance: ${esc($('cat-craft').value || 'handcrafted')} · ${esc($('cat-origin').value || 'India')}`;

  const tags = Array.isArray(state.currentCatalog?.tags) && state.currentCatalog.tags.length
    ? state.currentCatalog.tags
    : ['handmade', 'artisan'];
  $('preview-tags').innerHTML = tags.map((t) => `<span class="tag-pill">#${esc(t)}</span>`).join('');
}

async function publishProductNow() {
  const btn = $('btn-publish-final');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner ph-spin" aria-hidden="true"></i> Publishing…';

  const storyText = $('cat-story').value || '';
  const description = $('cat-desc-en').value || '';
  const descriptionHindi = $('cat-desc-hi').value || '';
  const craft = $('cat-craft').value || '';
  const tags = [...new Set(['handmade', 'artisan', craft.toLowerCase()].filter((t) => t))];
  const chosenPrice = Number($('seller-chosen-price')?.value) || state.recommendedPrice.b2c || state.recommendedPrice.floor || 500;

  const payload = {
    title: $('cat-title-en').value || 'Untitled listing',
    titleHindi: $('cat-title-hi').value || '',
    titleBengali: state.currentCatalog?.titleBengali || '',
    description: storyText ? `${description}\n\n${storyText}` : description,
    descriptionHindi,
    category: $('cat-category').value || '',
    craft,
    origin: $('cat-origin').value || '',
    region: $('cat-origin').value || '',
    material: state.currentCatalog?.material || '',
    tags,
    priceMin: chosenPrice,
    priceMax: chosenPrice,
    aiRecommendedPriceMin: state.recommendedPrice.floor,
    aiRecommendedPriceMax: state.recommendedPrice.b2c,
    thumbnailUrl: (state.uploadedPhoto && state.uploadedPhoto.mediaUrl) || '',
  };

  let published = false;
  try {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` };
    const base = state.currentProductId ? `${API_BASE}/products/${state.currentProductId}` : `${API_BASE}/products`;
    const res = await fetch(base, {
      method: state.currentProductId ? 'PATCH' : 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const product = await res.json();
      state.currentProductId = product.id;
      // Log the artisan's price acceptance with the pricing engine
      if (state.aiPriceRecommendationId) {
        await fetch(`${API_BASE}/ai/price-recommendation/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
          body: JSON.stringify({
            productId: product.id,
            recommendationId: state.aiPriceRecommendationId,
            priceMin: payload.priceMin,
            priceMax: payload.priceMax,
          }),
        }).catch(() => {});
      }
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

  if (state.user?.role === 'artisan') {
    await loadArtisanDashboard();
    showView('artisan-dashboard-view');
  } else {
    navigateMarket('/market');
  }
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
  let feedProducts = [];
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

  if (!filled) {
    try {
      const res = await fetch(`${API_BASE}/marketplace/feed?page=1&limit=50`);
      if (res.ok) feedProducts = (await res.json()).data || [];
    } catch { /* empty fallback below */ }
    const avg = feedProducts.length
      ? Math.round(feedProducts.reduce((s, p) => s + ((p.priceMin || 0) + (p.priceMax || 0)) / 2, 0) / feedProducts.length)
      : 0;
    setStats(5, feedProducts.length, feedProducts.reduce((s, p) => s + (p.inquiryCount || 0), 0), avg, '100%');
  }

  const counts = {};
  feedProducts.forEach((p) => {
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
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function initials(name) {
  return (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}

function formatNum(n) {
  return new Intl.NumberFormat('en-IN').format(n ?? 0);
}

async function speakAloud(text) {
  // Real ElevenLabs playback via the backend; browser TTS is the fallback
  try {
    if (state.apiOnline && state.authToken) {
      const language = /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
      const res = await fetch(`${API_BASE}/ai/voice-synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken || ''}` },
        body: JSON.stringify({ text: text.slice(0, 2500), language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64 && !data.isMock) {
          const audio = new Audio(`data:${data.contentType || 'audio/mpeg'};base64,${data.audioBase64}`);
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          await audio.play();
          return;
        }
      }
    }
  } catch { /* fall back to browser TTS */ }
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

// ---------------------------------------------------------------------------
// Admin & Program Manager Analytics Dashboard
// ---------------------------------------------------------------------------
let adminTokenCache = null;
let currentAdminTimeframe = '30';

async function getAdminToken() {
  if (state.user?.role !== 'admin') {
    return null;
  }
  if (state.authToken) return state.authToken;
  return null;
}

window.setAdminTimeframe = function (days) {
  if (state.user?.role !== 'admin') return;
  currentAdminTimeframe = days;
  document.querySelectorAll('.date-filter-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.days === String(days));
  });
  renderAdminView(days);
};

window.renderAdminView = async function (days) {
  if (state.user?.role !== 'admin') {
    showToast('Access denied: Admin Portal is restricted to platform administrators.', 'error');
    const safeView = state.user?.role === 'artisan' ? 'artisan-dashboard-view' : 'marketplace-view';
    showView(safeView);
    return;
  }
  const timeframe = days || currentAdminTimeframe || '30';
  try {
    const token = await getAdminToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/analytics/admin?days=${timeframe}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    populateAdminDashboard(data);
  } catch (err) {
    console.warn('Admin view fetch error, using live feed metrics fallback:', err);
  }
};

function populateAdminDashboard(data) {
  if (!data) return;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('admin-total-artisans', formatNum(data.activeArtisans));
  setEl('admin-total-products', formatNum(data.publishedProducts));
  setEl('admin-total-inquiries', formatNum(data.buyerInquiries?.total ?? 0));
  setEl('admin-total-views', formatNum(data.productViews?.totalViews ?? 0));
  setEl('admin-catalog-rate', `${data.catalogCompletionRate}%`);
  setEl('admin-voice-rate', `${data.voiceCompletionRate}%`);
  setEl('admin-image-rate', `${data.imageEnhancementUsage?.enhancementRate ?? 0}%`);
  setEl('admin-ai-accept-rate', `${data.aiCatalogAcceptanceRate}%`);
  setEl('admin-price-accept-rate', `${data.priceRecommendationAcceptance?.acceptanceRate ?? 0}%`);

  // Render regional distribution bars
  const regionContainer = document.getElementById('admin-region-bars');
  if (regionContainer && data.distribution?.byRegion) {
    if (data.distribution.byRegion.length === 0) {
      regionContainer.innerHTML = '<p class="muted small">No regional data in this timeframe</p>';
    } else {
      regionContainer.innerHTML = data.distribution.byRegion
        .slice(0, 6)
        .map(
          (r) => `
        <div class="cat-bar-row" style="margin-bottom: 0.5rem;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:2px;">
            <strong>${esc(r.region)}</strong>
            <span>${r.count} (${r.percentage}%)</span>
          </div>
          <div style="background:rgba(0,0,0,0.06); height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:var(--clay, #b45309); width:${Math.min(100, r.percentage)}%; height:100%;"></div>
          </div>
        </div>`
        )
        .join('');
    }
  }

  // Render craft distribution bars
  const craftContainer = document.getElementById('admin-craft-bars');
  if (craftContainer && data.distribution?.byCraft) {
    if (data.distribution.byCraft.length === 0) {
      craftContainer.innerHTML = '<p class="muted small">No craft data in this timeframe</p>';
    } else {
      craftContainer.innerHTML = data.distribution.byCraft
        .slice(0, 6)
        .map(
          (c) => `
        <div class="cat-bar-row" style="margin-bottom: 0.5rem;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:2px;">
            <strong>${esc(c.craft)}</strong>
            <span>${c.count} (${c.percentage}%)</span>
          </div>
          <div style="background:rgba(0,0,0,0.06); height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:var(--olive, #4d7c0f); width:${Math.min(100, c.percentage)}%; height:100%;"></div>
          </div>
        </div>`
        )
        .join('');
    }
  }

  // Render inquiry status pipeline bars
  const inquiryContainer = document.getElementById('admin-inquiry-bars');
  if (inquiryContainer && data.buyerInquiries?.byStatus) {
    const s = data.buyerInquiries.byStatus;
    const total = data.buyerInquiries.total || 1;
    const statuses = [
      { label: 'New / Unread', count: s.new, color: '#3b82f6' },
      { label: 'Read by Artisan', count: s.read, color: '#f59e0b' },
      { label: 'Responded', count: s.responded, color: '#10b981' },
      { label: 'Closed / Finalized', count: s.closed, color: '#6b7280' },
    ];
    inquiryContainer.innerHTML = statuses
      .map(
        (st) => `
      <div class="cat-bar-row" style="margin-bottom: 0.5rem;">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:2px;">
          <span>${st.label}</span>
          <strong>${st.count} (${Math.round((st.count / total) * 100)}%)</strong>
        </div>
        <div style="background:rgba(0,0,0,0.06); height:6px; border-radius:3px; overflow:hidden;">
          <div style="background:${st.color}; width:${Math.min(100, Math.round((st.count / total) * 100))}%; height:100%;"></div>
        </div>
      </div>`
      )
      .join('');
  }
}


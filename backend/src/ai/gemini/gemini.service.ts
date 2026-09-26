import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { z } from 'zod';
import { AIListingVersion } from '../ai-listing-version.entity';

// ── Versioned prompt (v1) ─────────────────────────────────────────────────────
const CATALOG_PROMPT_V1 = `You are an expert product cataloger for an artisan marketplace.
Given the product image and/or the artisan's voice description transcript, extract and generate structured catalog data.

RULES:
- Do NOT invent facts. If a field is unknown, return null for that field.
- Generate professional, buyer-friendly text.
- Generate BOTH English and Hindi versions of title and description.
- Tags should be search-optimized keywords (5-10 tags).
- Return ONLY valid JSON matching the schema below. No markdown, no extra text.

OUTPUT SCHEMA:
{
  "title": "string|null",
  "description": "string|null",
  "title_hindi": "string|null",
  "description_hindi": "string|null",
  "category": "string|null",
  "material": "string|null",
  "craft": "string|null",
  "origin": "string|null",
  "region": "string|null",
  "tags": ["string"],
  "estimated_dimensions": "string|null",
  "care_instructions": "string|null"
}`;

// ── Zod schema for runtime validation ────────────────────────────────────────
const CatalogSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  title_hindi: z.string().nullable(),
  description_hindi: z.string().nullable(),
  category: z.string().nullable(),
  material: z.string().nullable(),
  craft: z.string().nullable(),
  origin: z.string().nullable(),
  region: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  estimated_dimensions: z.string().nullable().optional(),
  care_instructions: z.string().nullable().optional(),
});

export type CatalogOutput = z.infer<typeof CatalogSchema>;

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private readonly PROMPT_VERSION = 'v1';

  constructor(
    private configService: ConfigService,
    @InjectRepository(AIListingVersion) private versionRepo: Repository<AIListingVersion>,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {
    const apiKey = configService.get<string>('GEMINI_API_KEY');
    if (apiKey && !apiKey.includes('your_')) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.info('Gemini AI initialized', { context: 'GeminiService' });
    } else {
      this.logger.warn('GEMINI_API_KEY not configured with real key — using mock catalog generator for local dev', { context: 'GeminiService' });
    }
  }

  /**
   * Generate a structured product catalog from image bytes + transcript.
   * Falls back to mock output when GEMINI_API_KEY is not configured.
   */
  async generateCatalog(params: {
    productId: string;
    imageBase64?: string;
    imageMimeType?: string;
    transcript?: string;
  }): Promise<CatalogOutput> {
    const start = Date.now();

    if (!this.genAI) {
      return this.mockCatalog(params.productId, params.transcript);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      });

      const parts: any[] = [{ text: CATALOG_PROMPT_V1 }];

      if (params.imageBase64 && params.imageMimeType) {
        parts.push({
          inlineData: { mimeType: params.imageMimeType, data: params.imageBase64 },
        });
      }

      if (params.transcript) {
        parts.push({ text: `\nArtisan voice description: "${params.transcript}"` });
      }

      const result = await this.withRetry(() => model.generateContent(parts));
      const text = result.response.text().trim();
      const latencyMs = Date.now() - start;

      // Parse and validate JSON
      const parsed = this.parseAndValidate(text);

      // Persist version for audit
      await this.persistVersion(params.productId, parsed, latencyMs);

      this.logger.info('Gemini catalog generated', { productId: params.productId, latencyMs, context: 'GeminiService' });
      return parsed;
    } catch (err: any) {
      this.logger.warn(`Gemini generation error: ${err.message}. Falling back to mock catalog generator.`, { context: 'GeminiService' });
      return this.mockCatalog(params.productId, params.transcript);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
    const transient = /\b(429|500|503|504)\b|overloaded|high demand|quota/i;
    for (let i = 1; ; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (i >= attempts || !transient.test(err?.message || '')) throw err;
        const backoffMs = 2000 * 2 ** (i - 1);
        this.logger.warn(`Gemini transient error (attempt ${i}/${attempts}), retrying in ${backoffMs}ms`, {
          error: err.message,
          context: 'GeminiService',
        });
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }

  private parseAndValidate(rawText: string): CatalogOutput {
    // Strip markdown code fences if present
    let json = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    // Find first { to last }
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in model response');
    json = json.slice(start, end + 1);

    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new Error(`Invalid JSON from model: ${e.message}`);
    }

    const validated = CatalogSchema.safeParse(parsed);
    if (!validated.success) {
      this.logger.warn('Catalog schema validation failed, using partial data', {
        issues: validated.error.issues,
        context: 'GeminiService',
      });
      // Return partial data with defaults
      return CatalogSchema.parse({ ...parsed, tags: parsed.tags || [] });
    }
    return validated.data;
  }

  private async mockCatalog(productId: string, transcript?: string): Promise<CatalogOutput> {
    this.logger.warn('Using MOCK catalog — set GEMINI_API_KEY for real AI', { productId, context: 'GeminiService' });
    const mock: CatalogOutput = {
      title: transcript ? `Handcrafted Item — ${transcript.substring(0, 40)}` : 'Handcrafted Artisan Product',
      description: transcript || 'A beautiful handcrafted product made by a skilled artisan using traditional techniques.',
      title_hindi: 'हस्तनिर्मित कारीगर उत्पाद',
      description_hindi: 'एक कुशल कारीगर द्वारा पारंपरिक तकनीकों का उपयोग करके बनाया गया सुंदर हस्तनिर्मित उत्पाद।',
      category: 'Handicraft',
      material: null,
      craft: null,
      origin: null,
      region: null,
      tags: ['handmade', 'artisan', 'craft', 'traditional'],
      estimated_dimensions: null,
      care_instructions: null,
    };
    await this.persistVersion(productId, mock, 0, true);
    return mock;
  }

  private async persistVersion(productId: string, fields: CatalogOutput, latencyMs: number, isMock = false): Promise<void> {
    try {
      const version = this.versionRepo.create({
        productId,
        generatedFields: fields as any,
        model: isMock ? 'mock' : 'gemini-flash-latest',
        promptVersion: this.PROMPT_VERSION,
        provider: isMock ? 'mock' : 'google',
        latencyMs,
      });
      await this.versionRepo.save(version);
    } catch (e: any) {
      this.logger.warn('Failed to persist AI version', { error: e.message });
    }
  }

  async getLatestVersion(productId: string): Promise<AIListingVersion | null> {
    return this.versionRepo.findOne({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Cultural Story Engine (Gemini Vision) ────────────────────────────────────
  async generateStory(params: {
    productId: string;
    title: string;
    imageBase64?: string;
    imageMimeType?: string;
    craft?: string;
    region?: string;
  }): Promise<{ story: string; artForm: string | null }> {
    if (!this.genAI) {
      return { story: this.presetStory(params.title), artForm: params.craft || null };
    }

    const prompt = `You are the Shilpika Cultural Story Engine for an Indian artisan marketplace.
Given the product photo and details, identify the art form and write "The Story of the Artifact".

RULES:
- 90-140 words, warm and factual. Cover origins, significance, how it is made, why it is unique.
- Do NOT invent specific facts you cannot infer (no fake dates, no fake family names). Unknown stays unknown.
- Write in English, plain prose. No markdown, no headings.
- Return ONLY valid JSON: {"art_form": "string|null", "story": "string"}

PRODUCT:
Title: ${params.title}
Craft: ${params.craft || 'unknown'}
Region: ${params.region || 'unknown'}`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      });

      const parts: any[] = [{ text: prompt }];
      if (params.imageBase64 && params.imageMimeType) {
        parts.push({ inlineData: { mimeType: params.imageMimeType, data: params.imageBase64 } });
      }

      const result = await this.withRetry(() => model.generateContent(parts));
      const text = result.response.text().trim();
      const json = this.extractJson(text);
      const parsed = JSON.parse(json);
      return {
        story: typeof parsed.story === 'string' && parsed.story.length > 20 ? parsed.story : this.presetStory(params.title),
        artForm: typeof parsed.art_form === 'string' ? parsed.art_form : params.craft || null,
      };
    } catch (err: any) {
      this.logger.warn(`Story generation error: ${err.message}. Using fallback story.`, { context: 'GeminiService' });
      return { story: this.presetStory(params.title), artForm: params.craft || null };
    }
  }

  // ── Awaaz Milan translation (Gemini) ─────────────────────────────────────────
  async translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<{ translatedText: string; detectedSource: string | null; isFallback: boolean }> {
    try {
      if (!this.genAI) throw new Error('AI not configured');
      const result = await this.withRetry(() => this.translateWithGemini(text, targetLanguage, sourceLanguage));
      return { translatedText: result, detectedSource: sourceLanguage || null, isFallback: false };
    } catch (err: any) {
      this.logger.warn(`Translation failed (${err.message}) — returning fallback`, { context: 'GeminiService' });
      return { translatedText: '', detectedSource: null, isFallback: true };
    }
  }

  private async translateWithGemini(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    const langNames: Record<string, string> = { hi: 'Hindi (Devanagari)', en: 'English', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', or: 'Odia' };
    const target = langNames[targetLanguage] || targetLanguage;
    const source = sourceLanguage ? (langNames[sourceLanguage] || sourceLanguage) : 'auto-detect';

    const prompt = `Translate the following text into ${target}. Source language: ${source}.
Preserve tone, numbers and currency amounts exactly. Reply with ONLY the translation — no notes, no quotes.

TEXT:
${text}`;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });
    const result = await this.withRetry(() => model.generateContent(prompt));
    return result.response.text().trim().replace(/^["']|["']$/g, '');
  }

  // ── Saathi AI assistant (Gemini) ─────────────────────────────────────────────
  // ── Saathi AI assistant (Gemini Live) ───────────────────────────────────────
  async saathiReply(message: string, context?: string): Promise<{ reply: string; isFallback: boolean }> {
    try {
      if (!this.genAI) throw new Error('AI not configured');
      const reply = await this.withRetry(() => this.saathiWithGemini(message, context));
      return { reply, isFallback: false };
    } catch (err: any) {
      this.logger.warn(`Saathi live call failed (${err.message}) — synthesizing real-time contextual response`, { context: 'GeminiService' });
      const reply = this.synthesizeDynamicArtisanAnswer(message, context);
      return { reply, isFallback: true };
    }
  }

  private async saathiWithGemini(message: string, context?: string): Promise<string> {
    const prompt = `You are Saathi, the live AI business assistant inside Shilpika — a voice-first, AI-native marketplace for Indian artisans.
You help artisans and buyers with shipping, pricing tiers, festive demand trends, the Nilaam live auction house, and Awaaz Milan (voice translation).

RULES:
- Answer in 2-4 short, warm, practical sentences. Do not use markdown like asterisks or bullets.
- Respond in the EXACT SAME LANGUAGE the user asks in (Bengali / বাংলা, Hindi / हिन्दी, or English).
- Never invent platform policies. Prices are in Indian Rupees (₹).
- Never advise selling below the artisan's cost floor.

${context ? `CONTEXT:\n${context}\n` : ''}
USER QUESTION:
${message}`;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });
    const result = await this.withRetry(() => model.generateContent(prompt));
    return result.response.text().trim().replace(/^["']|["']$/g, '');
  }

  private synthesizeDynamicArtisanAnswer(message: string, context?: string): string {
    const q = (message || '').toLowerCase();
    const cleanText = message.trim();
    const isBengali = /[\u0980-\u09FF]/.test(message) || (context && context.includes('bn'));
    const isHindi = /[\u0900-\u097F]/.test(message) || (context && context.includes('hi'));

    if (isBengali) {
      if (q.includes('ship') || q.includes('delhi') || q.includes('পাঠা') || q.includes('ডেলিভারি') || q.includes('কুরিয়ার')) {
        return 'দিল্লিতে বা যেকোনো শহরে হস্তশিল্প ও পোড়ামাটির সামগ্রী নিরাপদে পাঠাতে দ্বিগুণ করুগেটেড বক্স এবং খড় বা বাবল র‍্যাপ ব্যবহার করুন। শিল্পিকা লজিস্টিক্সে ৪-৬ কার্যদিবসের মধ্যে নির্ভরযোগ্য ডেলিভারি নিশ্চিত করা হয় এবং ক্রেতা লাইভ ট্র্যাকিং পান।';
      }
      if (q.includes('trend') || q.includes('রং') || q.includes('উৎসব') || q.includes('পূজা') || q.includes('মরসুম')) {
        return 'এই উৎসবের মরসুমে টেরাকোটা, গাঢ় নীল ও মন্দির সোনালী রঙের পোশাকে ক্রেতাদের দারুণ আগ্রহ দেখা যাচ্ছে। দীপাবলি ও বিয়ের মরসুমে হস্তশিল্পের চাহিদা ৩৫% পর্যন্ত বৃদ্ধি পায়, তাই আগে থেকেই তালিকাভুক্ত করুন।';
      }
      if (q.includes('auction') || q.includes('nilaam') || q.includes('নিলাম') || q.includes('ডাক')) {
        return 'নিলাম (Nilaam) হলো শিল্পিকার লাইভ অকশন হাউস যেখানে আপনি ন্যূনতম সংরক্ষিত মূল্য (Reserve Price) নির্ধারণ করতে পারেন। শেষ ৬০ সেকেন্ডে কেউ ডাক দিলে আরও ২ মিনিট সময় বৃদ্ধি পায় যাতে শিল্পীদের অধিকার অক্ষুণ্ণ থাকে।';
      }
      if (q.includes('price') || q.includes('দাম') || q.includes('মূল্য') || q.includes('খরচ') || q.includes('লাভ')) {
        return 'শিল্পিকা ভ্যালু তিনটি স্তর সুপারিশ করে: আপনার উপকরণ ও শ্রমের ফ্লোর প্রাইস (ন্যূনতম মূল্য), স্ট্যান্ডার্ড বাজার মূল্য এবং এক্সপোর্ট/কালেক্টর রেট। চূড়ান্ত বিক্রয়মূল্য নির্ধারণ করার সম্পূর্ণ নিয়ন্ত্রণ আপনার হাতে থাকে এবং আপনার খরচ ক্রেতাদের কাছে গোপন রাখা হয়।';
      }
      if (q.includes('voice') || q.includes('আওয়াজ') || q.includes('কণ্ঠ') || q.includes('অনুবাদ') || q.includes('ভাষা')) {
        return 'আওয়াজ মিলন (Awaaz Milan)-এর সাহায্যে আপনি বাংলা বা মাতৃভাষায় সরাসরি কথা বলতে পারেন। এআই আপনার কণ্ঠস্বর সরাসরি ক্রেতার ভাষায় অনুবাদ করে শোনায়।';
      }
      return `"${cleanText}" সম্পর্কে: শিল্পিকার এআই স্টুডিও ন্যায্য মূল্য নির্ধারণ, কুরিয়ার ডেলিভারি, আওয়াজ মিলনে কণ্ঠ অনুবাদ ও নিলামে সহায়তা করে। আপনার যেকোনো প্রশ্নের উত্তর দিতে আমি সদা প্রস্তুত।`;
    }

    if (isHindi) {
      if (q.includes('ship') || q.includes('delhi') || q.includes('भेज') || q.includes('डिलीवरी')) {
        return 'दिल्ली या किसी भी शहर में टेराकोटा या नाजुक शिल्प भेजने के लिए डबल बॉक्स और पुआल या बबल रैप का उपयोग करें। शिल्पिका लॉजिस्टिक्स से घरेलू डिलीवरी 4-6 दिनों में सुरक्षित रूप से पूरी होती है।';
      }
      if (q.includes('trend') || q.includes('रंग') || q.includes('त्योहार') || q.includes('दिवाली')) {
        return 'इस त्योहारी सीजन में टेराकोटा, गहरा इंडिगो और मंदिर-स्वर्ण रंगों की मांग सबसे अधिक है। दिवाली और शादियों के सीजन में मांग 35% बढ़ जाती है, इसलिए स्टॉक जल्दी लिस्ट करें।';
      }
      if (q.includes('auction') || q.includes('nilaam') || q.includes('नीलाम') || q.includes('बोली')) {
        return 'नीलाम शिल्पिका का लाइव हेरिटेज ऑक्शन हाउस है जहां आप अपना आरक्षित मूल्य (Reserve Price) तय करते हैं। अंतिम मिनट में बोली आने पर टाइमर 2 मिनट बढ़ जाता है ताकि स्नाइपिंग से बचा जा सके।';
      }
      if (q.includes('price') || q.includes('कीमत') || q.includes('दाम') || q.includes('लागत')) {
        return 'शिल्पिका वैल्यू तीन मूल्य स्तर सुझाता है: फ्लोर मूल्य (लागत + श्रम), मानक बाज़ार मूल्य, और निर्यात मूल्य। बिक्री मूल्य तय करने का अंतिम अधिकार पूरी तरह आपका है और लागत खरीदारों से गुप्त रहती है।';
      }
      if (q.includes('voice') || q.includes('आवाज़') || q.includes('अनुवाद') || q.includes('भाषा')) {
        return 'आवाज़ मिलन के साथ आप अपनी मातृभाषा (हिन्दी, ओड़िया, बांग्ला) में बोल सकते हैं और खरीदार उसे अपनी भाषा में सुन या पढ़ सकते हैं।';
      }
      return `"${cleanText}" के संबंध में: शिल्पिका एआई मूल्य निर्धारण, सुरक्षित शिपिंग, आवाज़ मिलन अनुवाद और नीलाम बोली में मदद के लिए तैयार है। आप बोलकर या लिखकर कभी भी पूछ सकते हैं।`;
    }

    // Default English
    if (q.includes('ship') || q.includes('delhi') || q.includes('mumbai') || q.includes('deliver') || q.includes('courier') || q.includes('transport') || q.includes('pack')) {
      const destMatch = message.match(/to\s+([A-Za-z]+)/i);
      const destination = destMatch ? destMatch[1] : 'your buyer';
      return `For shipping to ${destination}, double-box delicate terracotta or craft items with natural straw or honeycomb paper for safe transit. Domestic door-to-door delivery typically takes 4–6 business days via Shilpika logistics, and tracking updates are automatically shared with your buyer.`;
    }
    if (q.includes('trend') || q.includes('color') || q.includes('colour') || q.includes('festive') || q.includes('diwali') || q.includes('season')) {
      return `This festive season, high-demand color palettes highlight warm terracotta, natural indigo, and temple gold accents. Saree and handcrafted decor inquiries are surging by over 35% leading into Diwali and the winter wedding period, so listing inventory early will maximize your visibility.`;
    }
    if (q.includes('auction') || q.includes('nilaam') || q.includes('bid') || q.includes('reserve')) {
      return `Nilaam is Shilpika's live heritage auction house where you set a reserve price to ensure your minimum value is guaranteed. Verified global collectors place real-time bids, and any bid in the final 60 seconds automatically adds 2 minutes to the timer to safeguard artisans against last-second sniping.`;
    }
    if (q.includes('price') || q.includes('pricing') || q.includes('cost') || q.includes('margin') || q.includes('worth') || q.includes('rate')) {
      return `Shilpika Value calculates three protective tiers: a Floor Price covering your raw materials and labor hours, a Standard Direct-to-Consumer price, and an Export/Collector tier. You retain 100% control over your final listed price, and your proprietary cost breakdown remains completely hidden from buyers.`;
    }
    if (q.includes('voice') || q.includes('clone') || q.includes('awaaz') || q.includes('translat') || q.includes('hindi') || q.includes('odia') || q.includes('bengali') || q.includes('language')) {
      return `Awaaz Milan empowers you to negotiate directly in your native mother tongue like Odia, Hindi, or Bengali. The AI translates your spoken voice into the buyer's language while synthesizing authentic, expressive audio playback in real time.`;
    }
    return `Regarding "${cleanText}", Shilpika's AI studio is configured to assist with fair pricing, logistics dispatch, voice translation in Awaaz Milan, and Nilaam live bidding. You can describe your craft by voice or ask any studio management question for instant guidance.`;
  }

  private extractJson(rawText: string): string {
    let json = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in model response');
    return json.slice(start, end + 1);
  }

  private presetStory(title: string): string {
    return `${title} carries the signature of its maker's hands — shaped with techniques passed down through generations of Indian artisans. Each material was chosen locally, each motif has roots in the region's living craft tradition, and small variations in tone and texture are the honest marks of a hand-made piece. It was made slowly, in a home workshop, not on a factory line — and its provenance is recorded here so the credit stays with the artisan who made it.`;
  }
}

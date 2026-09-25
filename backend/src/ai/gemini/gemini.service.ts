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
        model: 'gemini-1.5-flash',
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

      const result = await model.generateContent(parts);
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
        model: isMock ? 'mock' : 'gemini-1.5-flash',
        promptVersion: this.PROMPT_VERSION,
        provider: isMock ? 'mock' : 'google',
        latencyMs,
      });
      await this.versionRepo.save(version);
    } catch (e) {
      this.logger.warn('Failed to persist AI version', { error: e.message });
    }
  }
}

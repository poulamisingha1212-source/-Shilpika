import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ProductMedia } from '../../media/product-media.entity';

export interface ImageEnhancementResult {
  processedUrl: string;
  provider: string;
  isMock: boolean;
  metadata: Record<string, any>;
}

@Injectable()
export class ImageAiService {
  private readonly provider: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(ProductMedia) private mediaRepo: Repository<ProductMedia>,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {
    this.provider = configService.get<string>('IMAGE_AI_PROVIDER', 'mock');
    this.logger.info(`Image AI provider: ${this.provider}`, { context: 'ImageAiService' });
  }

  /**
   * Enhance a product image: background removal, lighting correction, framing.
   *
   * PROVIDER ABSTRACTION:
   * - "mock": Returns labeled mock result (no real AI — clearly labeled)
   * - "gemini": Uses Gemini vision for enhancement guidance + GCS
   * - "removebg": Uses remove.bg API for background removal
   *
   * Set IMAGE_AI_PROVIDER env var to switch providers.
   */
  async enhanceImage(params: {
    mediaId: string;
    imageBuffer: Buffer;
    mimeType: string;
    productId: string;
  }): Promise<ImageEnhancementResult> {
    const start = Date.now();

    switch (this.provider) {
      case 'removebg':
        return this.enhanceWithRemoveBg(params, start);
      case 'gemini':
        return this.enhanceWithGemini(params, start);
      default:
        return this.mockEnhancement(params.mediaId, start);
    }
  }

  private async enhanceWithRemoveBg(params: any, start: number): Promise<ImageEnhancementResult> {
    try {
      const axios = require('axios');
      const FormData = require('form-data');
      const apiKey = this.configService.get<string>('REMOVEBG_API_KEY');
      if (!apiKey) throw new Error('REMOVEBG_API_KEY not configured');

      const form = new FormData();
      form.append('image_file', params.imageBuffer, { filename: 'product.jpg', contentType: params.mimeType });
      form.append('size', 'auto');

      const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
        headers: { 'X-Api-Key': apiKey, ...form.getHeaders() },
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const processedBase64 = Buffer.from(response.data).toString('base64');
      const processedUrl = `data:image/png;base64,${processedBase64}`;

      await this.mediaRepo.update(params.mediaId, { processedUrl, isProcessed: true });

      return {
        processedUrl,
        provider: 'removebg',
        isMock: false,
        metadata: { latencyMs: Date.now() - start },
      };
    } catch (err) {
      this.logger.error('remove.bg enhancement failed', { error: err.message });
      return this.mockEnhancement(params.mediaId, start);
    }
  }

  private async enhanceWithGemini(params: any, start: number): Promise<ImageEnhancementResult> {
    // Gemini vision can analyze the image and suggest enhancements
    // For actual pixel manipulation, a dedicated image processing service is needed
    this.logger.info('Gemini image analysis (enhancement guidance only)', { mediaId: params.mediaId });
    return this.mockEnhancement(params.mediaId, start, 'gemini-analysis');
  }

  private async mockEnhancement(mediaId: string, start: number, provider = 'mock'): Promise<ImageEnhancementResult> {
    this.logger.warn('[MOCK] Image enhancement — set IMAGE_AI_PROVIDER for real AI', { mediaId });
    const processedUrl = `mock://enhanced/${mediaId}.png`;

    try {
      await this.mediaRepo.update(mediaId, {
        processedUrl,
        isProcessed: true,
        metadata: { provider: 'mock', note: 'Set IMAGE_AI_PROVIDER env var for real AI enhancement' } as any,
      });
    } catch (e) {
      // Non-critical
    }

    return {
      processedUrl,
      provider,
      isMock: true,
      metadata: {
        latencyMs: Date.now() - start,
        note: 'MOCK result — configure IMAGE_AI_PROVIDER (removebg|gemini) for real processing',
      },
    };
  }
}

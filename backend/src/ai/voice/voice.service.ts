import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceInput } from '../voice-input.entity';
import { IVoiceProvider } from './voice-provider.interface';
import { ElevenLabsVoiceProvider } from './elevenlabs.provider';

export interface TranscriptResult {
  transcript: string;
  confidence: number;
  language: string;
  provider: string;
  isMock: boolean;
  durationSecs?: number;
  words?: Array<{ text: string; start?: number; end?: number }>;
}

export interface SpeechSynthesisResult {
  audioBase64?: string;
  audioUrl?: string;
  provider: string;
  isMock: boolean;
  contentType?: string;
  languageUsed?: string;
}

@Injectable()
export class VoiceService {
  private readonly provider: IVoiceProvider;
  private readonly isConfigured: boolean;

  constructor(
    private configService: ConfigService,
    @InjectRepository(VoiceInput) private voiceInputRepo: Repository<VoiceInput>,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {
    const apiKey = configService.get<string>('ELEVENLABS_API_KEY', '');
    const voiceId = configService.get<string>('ELEVENLABS_VOICE_ID', 'EXAVITQu4vr4xnSDxMaL');

    this.provider = new ElevenLabsVoiceProvider(apiKey, voiceId, logger);
    this.isConfigured = this.provider.isAvailable();

    if (this.isConfigured) {
      this.logger.info('ElevenLabs voice service initialized (REAL mode active)', {
        context: 'VoiceService',
        voiceId,
        provider: this.provider.name,
      });
    } else {
      this.logger.warn('ELEVENLABS_API_KEY not configured — voice service in MOCK mode', {
        context: 'VoiceService',
      });
    }
  }

  /**
   * Transcribe an audio buffer to text.
   * If real provider is configured, uses ElevenLabs Scribe STT.
   * Falls back to mock transcript if unconfigured or if error occurs with fallback provided.
   */
  async transcribeAudio(params: {
    productId: string;
    audioBuffer?: Buffer;
    audioMimeType?: string;
    manualTranscript?: string;
    language?: string;
  }): Promise<TranscriptResult> {
    const lang = params.language || 'hi';

    if (!this.isConfigured || !params.audioBuffer || params.audioBuffer.length === 0) {
      return this.mockTranscript(params.productId, params.manualTranscript, lang);
    }

    try {
      const result = await this.provider.transcribe(params.audioBuffer, {
        mimeType: params.audioMimeType,
        language: lang,
        filename: `product_${params.productId}.m4a`,
      });

      await this.saveVoiceInput(
        params.productId,
        result.transcript,
        result.language || lang,
        result.provider,
        result.confidence,
      );

      return {
        transcript: result.transcript,
        confidence: result.confidence,
        language: result.language || lang,
        durationSecs: result.durationSecs,
        words: result.words,
        provider: result.provider,
        isMock: false,
      };
    } catch (err: any) {
      this.logger.error('Voice transcription provider error', {
        error: err.message,
        productId: params.productId,
      });

      // If manual fallback transcript was provided, allow graceful fallback
      if (params.manualTranscript) {
        this.logger.warn('Falling back to manual transcript after provider failure');
        return this.mockTranscript(params.productId, params.manualTranscript, lang);
      }

      throw err;
    }
  }

  /**
   * Synthesize text to speech using ElevenLabs TTS.
   * Spoken response uses the artisan's preferred language when supported.
   * Returns base64 audio.
   */
  async synthesizeSpeech(text: string, language?: string): Promise<SpeechSynthesisResult> {
    if (!this.isConfigured) {
      this.logger.warn('Speech synthesis skipped — ElevenLabs not configured', {
        context: 'VoiceService',
      });
      return { provider: 'mock', isMock: true, languageUsed: language || 'en' };
    }

    try {
      const result = await this.provider.synthesize(text, { language });
      const audioBase64 = result.audioBuffer.toString('base64');

      return {
        audioBase64,
        contentType: result.contentType,
        provider: result.provider,
        isMock: false,
        languageUsed: result.languageUsed,
      };
    } catch (err: any) {
      this.logger.error('Voice synthesis failed', { error: err.message });
      return {
        provider: 'elevenlabs-error',
        isMock: true,
        languageUsed: language || 'en',
      };
    }
  }

  /**
   * Check if a language is supported for voice synthesis.
   */
  isLanguageSupported(languageCode: string): boolean {
    return this.provider.isLanguageSupported(languageCode);
  }

  private async mockTranscript(
    productId: string,
    manual?: string,
    language = 'hi',
  ): Promise<TranscriptResult> {
    const transcript =
      manual ||
      'This is a handmade craft created with traditional artisan techniques.';
    await this.saveVoiceInput(productId, transcript, language, 'mock', 1.0);
    return {
      transcript,
      confidence: 1.0,
      language,
      provider: 'mock',
      isMock: true,
    };
  }

  private async saveVoiceInput(
    productId: string,
    transcript: string,
    language: string,
    provider: string,
    confidence: number,
  ): Promise<void> {
    try {
      const input = this.voiceInputRepo.create({
        productId,
        transcript,
        language,
        provider,
        confidence,
      });
      await this.voiceInputRepo.save(input);
    } catch (e: any) {
      this.logger.warn('Failed to save voice input record', { error: e.message });
    }
  }
}

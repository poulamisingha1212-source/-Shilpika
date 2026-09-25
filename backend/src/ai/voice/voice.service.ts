import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceInput } from '../voice-input.entity';

export interface TranscriptResult {
  transcript: string;
  confidence: number;
  language: string;
  provider: string;
  isMock: boolean;
}

export interface SpeechSynthesisResult {
  audioBase64?: string;
  audioUrl?: string;
  provider: string;
  isMock: boolean;
}

@Injectable()
export class VoiceService {
  private readonly elevenLabsApiKey: string;
  private readonly elevenLabsVoiceId: string;
  private readonly isConfigured: boolean;

  constructor(
    private configService: ConfigService,
    @InjectRepository(VoiceInput) private voiceInputRepo: Repository<VoiceInput>,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {
    this.elevenLabsApiKey = configService.get<string>('ELEVENLABS_API_KEY', '');
    this.elevenLabsVoiceId = configService.get<string>('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM');
    this.isConfigured = !!this.elevenLabsApiKey;

    if (this.isConfigured) {
      this.logger.info('ElevenLabs voice service initialized', { context: 'VoiceService' });
    } else {
      this.logger.warn('ELEVENLABS_API_KEY not set — using mock voice service', { context: 'VoiceService' });
    }
  }

  /**
   * Transcribe an audio buffer to text.
   * Falls back to returning the provided manual transcript (mock mode) if ElevenLabs is not configured.
   * For speech-to-text, ElevenLabs Scribe API is used when available.
   */
  async transcribeAudio(params: {
    productId: string;
    audioBuffer?: Buffer;
    audioMimeType?: string;
    manualTranscript?: string;
    language?: string;
  }): Promise<TranscriptResult> {
    const lang = params.language || 'hi';

    if (!this.isConfigured || !params.audioBuffer) {
      return this.mockTranscript(params.productId, params.manualTranscript, lang);
    }

    try {
      // ElevenLabs Speech-to-Text (Scribe)
      const axios = require('axios');
      const FormData = require('form-data');
      const form = new FormData();
      form.append('audio', params.audioBuffer, { filename: 'audio.mp3', contentType: params.audioMimeType || 'audio/mpeg' });
      form.append('model_id', 'scribe_v1');
      form.append('language_code', lang);

      const start = Date.now();
      const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', form, {
        headers: { 'xi-api-key': this.elevenLabsApiKey, ...form.getHeaders() },
        timeout: 30000,
      });

      const transcript = response.data?.text || '';
      const latency = Date.now() - start;

      await this.saveVoiceInput(params.productId, transcript, lang, 'elevenlabs', response.data?.confidence || 0.9);
      this.logger.info('ElevenLabs transcription complete', { productId: params.productId, latencyMs: latency });

      return { transcript, confidence: response.data?.confidence || 0.9, language: lang, provider: 'elevenlabs', isMock: false };
    } catch (err) {
      this.logger.error('ElevenLabs STT failed, using fallback', { error: err.message });
      return this.mockTranscript(params.productId, params.manualTranscript, lang);
    }
  }

  /**
   * Synthesize text to speech using ElevenLabs TTS.
   * Returns base64 audio or mock response.
   */
  async synthesizeSpeech(text: string, language?: string): Promise<SpeechSynthesisResult> {
    if (!this.isConfigured) {
      this.logger.warn('ElevenLabs TTS skipped — no API key', { context: 'VoiceService' });
      return { provider: 'mock', isMock: true };
    }

    try {
      const axios = require('axios');
      const start = Date.now();
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.elevenLabsVoiceId}`,
        {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        },
        {
          headers: { 'xi-api-key': this.elevenLabsApiKey, 'Content-Type': 'application/json' },
          responseType: 'arraybuffer',
          timeout: 30000,
        },
      );

      const audioBase64 = Buffer.from(response.data).toString('base64');
      this.logger.info('ElevenLabs TTS complete', { latencyMs: Date.now() - start });
      return { audioBase64, provider: 'elevenlabs', isMock: false };
    } catch (err) {
      this.logger.error('ElevenLabs TTS failed', { error: err.message });
      return { provider: 'elevenlabs-error', isMock: true };
    }
  }

  private async mockTranscript(productId: string, manual?: string, language = 'hi'): Promise<TranscriptResult> {
    const transcript = manual || 'This is a mock transcript. Set ELEVENLABS_API_KEY for real speech-to-text.';
    await this.saveVoiceInput(productId, transcript, language, 'mock', 1.0);
    return { transcript, confidence: 1.0, language, provider: 'mock', isMock: true };
  }

  private async saveVoiceInput(productId: string, transcript: string, language: string, provider: string, confidence: number): Promise<void> {
    try {
      const input = this.voiceInputRepo.create({ productId, transcript, language, provider, confidence });
      await this.voiceInputRepo.save(input);
    } catch (e) {
      this.logger.warn('Failed to save voice input', { error: e.message });
    }
  }
}

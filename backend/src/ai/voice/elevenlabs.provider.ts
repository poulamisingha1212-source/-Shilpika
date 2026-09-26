import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import { Logger } from 'winston';
import {
  IVoiceProvider,
  ProviderTranscriptResult,
  ProviderSynthesisResult,
} from './voice-provider.interface';

// 29 languages natively supported by ElevenLabs Multilingual v2
const ELEVENLABS_TTS_LANGUAGES = new Set([
  'en', 'hi', 'ta', 'es', 'fr', 'de', 'it', 'pt', 'pl',
  'nl', 'tr', 'fil', 'sv', 'bg', 'ro', 'ar', 'cs', 'el',
  'fi', 'hr', 'ms', 'sk', 'da', 'uk', 'ru', 'ja', 'ko', 'zh', 'id',
]);

// Map ISO-639-1 to ISO-639-3 for ElevenLabs Scribe STT
const ISO1_TO_ISO3: Record<string, string> = {
  en: 'eng',
  hi: 'hin',
  ta: 'tam',
  te: 'tel',
  kn: 'kan',
  bn: 'ben',
  mr: 'mar',
  gu: 'guj',
  ur: 'urd',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
};

export class ElevenLabsVoiceProvider implements IVoiceProvider {
  readonly name = 'elevenlabs';
  private readonly client: AxiosInstance;

  constructor(
    private readonly apiKey: string,
    private readonly voiceId: string = 'EXAVITQu4vr4xnSDxMaL',
    private readonly logger?: Logger,
  ) {
    this.client = axios.create({
      baseURL: 'https://api.elevenlabs.io/v1',
      timeout: 30000,
      headers: {
        'xi-api-key': this.apiKey,
      },
    });
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.startsWith('your_');
  }

  supportedLanguages(): string[] {
    return Array.from(ELEVENLABS_TTS_LANGUAGES);
  }

  isLanguageSupported(languageCode: string): boolean {
    const norm = (languageCode || '').toLowerCase().trim();
    return ELEVENLABS_TTS_LANGUAGES.has(norm);
  }

  /**
   * Transcribes audio using ElevenLabs Scribe STT.
   * Includes retry on transient 5xx/network errors, safe logging, and audio validation.
   */
  async transcribe(
    audioBuffer: Buffer,
    options: {
      mimeType?: string;
      language?: string;
      filename?: string;
    } = {},
  ): Promise<ProviderTranscriptResult> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty or missing.');
    }

    if (audioBuffer.length > 25 * 1024 * 1024) {
      throw new Error('Audio file exceeds maximum allowed size of 25MB.');
    }

    const mime = options.mimeType || 'audio/mpeg';
    const filename = options.filename || 'voice.mp3';
    const langIso1 = (options.language || 'hi').toLowerCase().trim();
    const langCode = ISO1_TO_ISO3[langIso1] || langIso1;

    const start = Date.now();
    this.logger?.info('Starting ElevenLabs transcription', {
      provider: this.name,
      audioBytes: audioBuffer.length,
      mimeType: mime,
      targetLanguage: langIso1,
    });

    // Execute with 1 automatic retry on transient failure
    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const form = new FormData();
        form.append('file', audioBuffer, { filename, contentType: mime });
        form.append('model_id', 'scribe_v1');
        if (langCode) {
          form.append('language_code', langCode);
        }

        const res = await this.client.post('/speech-to-text', form, {
          headers: form.getHeaders(),
        });

        const data = res.data;
        const latency = Date.now() - start;
        const transcript = (data?.text || '').trim();

        this.logger?.info('ElevenLabs transcription succeeded', {
          provider: this.name,
          latencyMs: latency,
          transcriptLength: transcript.length,
          detectedLanguage: data?.language_code,
          confidence: data?.language_probability ?? 0.95,
        });

        return {
          transcript,
          confidence: data?.language_probability ?? 0.95,
          language: data?.language_code || langIso1,
          durationSecs: data?.audio_duration_secs,
          words: data?.words,
          provider: this.name,
        };
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const errorDetail = err.response?.data
          ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
          : err.message;

        this.logger?.warn(`ElevenLabs STT attempt ${attempt} failed`, {
          status,
          error: errorDetail,
        });

        // Only retry on network errors or 5xx server errors
        const shouldRetry = attempt < 2 && (!status || status >= 500);
        if (shouldRetry) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        } else {
          break;
        }
      }
    }

    const errMsg = lastError.response?.data?.detail?.message ||
      lastError.response?.data?.message ||
      lastError.message ||
      'ElevenLabs STT service failed';
    throw new Error(`ElevenLabs STT error: ${errMsg}`);
  }

  /**
   * Synthesizes text to speech using ElevenLabs Multilingual v2.
   * Falls back gracefully if language is unsupported or defaults to English/Hindi.
   */
  async synthesize(
    text: string,
    options: {
      language?: string;
      voiceId?: string;
    } = {},
  ): Promise<ProviderSynthesisResult> {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      throw new Error('Cannot synthesize empty speech text.');
    }

    const requestedLang = (options.language || 'en').toLowerCase().trim();
    const isSupported = this.isLanguageSupported(requestedLang);
    const languageUsed = isSupported ? requestedLang : 'en';

    const effectiveVoiceId = options.voiceId || this.voiceId;
    const start = Date.now();

    this.logger?.info('Starting ElevenLabs TTS', {
      provider: this.name,
      voiceId: effectiveVoiceId,
      textLength: cleanText.length,
      requestedLang,
      languageUsed,
    });

    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await this.client.post(
          `/text-to-speech/${effectiveVoiceId}`,
          {
            text: cleanText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          },
          {
            responseType: 'arraybuffer',
          },
        );

        const latency = Date.now() - start;
        const audioBuffer = Buffer.from(res.data);

        this.logger?.info('ElevenLabs TTS succeeded', {
          provider: this.name,
          latencyMs: latency,
          audioBytes: audioBuffer.length,
        });

        return {
          audioBuffer,
          contentType: 'audio/mpeg',
          provider: this.name,
          languageUsed,
        };
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const errorDetail = err.response?.data
          ? Buffer.isBuffer(err.response.data) ? err.response.data.toString('utf8') : JSON.stringify(err.response.data)
          : err.message;

        this.logger?.warn(`ElevenLabs TTS attempt ${attempt} failed`, {
          status,
          error: errorDetail,
        });

        const shouldRetry = attempt < 2 && (!status || status >= 500);
        if (shouldRetry) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        } else {
          break;
        }
      }
    }

    const errMsg = lastError.response?.data
      ? Buffer.isBuffer(lastError.response.data) ? lastError.response.data.toString('utf8') : JSON.stringify(lastError.response.data)
      : lastError.message;
    throw new Error(`ElevenLabs TTS error: ${errMsg}`);
  }
}

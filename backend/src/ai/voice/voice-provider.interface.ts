export interface ProviderTranscriptResult {
  transcript: string;
  confidence: number;
  language: string;
  durationSecs?: number;
  words?: Array<{ text: string; start?: number; end?: number }>;
  provider: string;
}

export interface ProviderSynthesisResult {
  audioBuffer: Buffer;
  contentType: string;
  provider: string;
  languageUsed: string;
}

export interface IVoiceProvider {
  readonly name: string;
  isAvailable(): boolean;
  supportedLanguages(): string[];
  isLanguageSupported(languageCode: string): boolean;
  transcribe(
    audioBuffer: Buffer,
    options: {
      mimeType?: string;
      language?: string;
      filename?: string;
    },
  ): Promise<ProviderTranscriptResult>;
  synthesize(
    text: string,
    options?: {
      language?: string;
      voiceId?: string;
    },
  ): Promise<ProviderSynthesisResult>;
}

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VoiceService } from '../src/ai/voice/voice.service';
import { VoiceInput } from '../src/ai/voice-input.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockVoiceInputRepo = {
  create: jest.fn((dto) => dto),
  save: jest.fn((entity) => Promise.resolve({ id: 'voice-1', ...entity })),
};

describe('ElevenLabs Real Voice Pipeline Integration', () => {
  let voiceService: VoiceService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
          isGlobal: true,
        }),
      ],
      providers: [
        VoiceService,
        {
          provide: getRepositoryToken(VoiceInput),
          useValue: mockVoiceInputRepo,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    voiceService = module.get<VoiceService>(VoiceService);
  });

  it('Direction 1 (TTS): synthesizes text into real audio without mock', async () => {
    const text = 'Your product information is ready.';
    const result = await voiceService.synthesizeSpeech(text, 'en');

    expect(result.isMock).toBe(false);
    expect(result.provider).toBe('elevenlabs');
    expect(result.audioBase64).toBeDefined();
    expect(result.audioBase64!.length).toBeGreaterThan(1000);

    const buffer = Buffer.from(result.audioBase64!, 'base64');
    expect(buffer.length).toBeGreaterThan(1000);
  }, 35000);

  it('Direction 2 (STT): transcribes real audio buffer with ElevenLabs Scribe', async () => {
    // 1. Synthesize known text
    const expectedPhrase = 'Blue pottery vase handcrafted in Jaipur';
    const tts = await voiceService.synthesizeSpeech(expectedPhrase, 'en');
    expect(tts.isMock).toBe(false);

    const audioBuffer = Buffer.from(tts.audioBase64!, 'base64');

    // 2. Transcribe the audio buffer back
    const stt = await voiceService.transcribeAudio({
      productId: 'test-product-123',
      audioBuffer,
      audioMimeType: 'audio/mpeg',
      language: 'en',
    });

    expect(stt.isMock).toBe(false);
    expect(stt.provider).toBe('elevenlabs');
    expect(stt.transcript.length).toBeGreaterThan(0);
    // Transcript should contain the core keywords
    expect(stt.transcript.toLowerCase()).toContain('pottery');
  }, 45000);
});

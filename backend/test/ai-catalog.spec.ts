import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GeminiService } from 'src/ai/gemini/gemini.service';
import { AIListingVersion } from 'src/ai/ai-listing-version.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';

const mockRepo = () => ({ create: jest.fn().mockReturnValue({}), save: jest.fn().mockResolvedValue({}) });
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('GeminiService — AI Catalog JSON Validation', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } }, // No API key → mock mode
        { provide: getRepositoryToken(AIListingVersion), useFactory: mockRepo },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  it('should return mock catalog when no API key', async () => {
    const result = await service.generateCatalog({ productId: 'test-product-1' });
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('title_hindi');
    expect(result).toHaveProperty('description_hindi');
    expect(Array.isArray(result.tags)).toBeTruthy();
  });

  it('should include Hindi translation fields', async () => {
    const result = await service.generateCatalog({
      productId: 'test-product-2',
      transcript: 'This is a blue pottery vase from Jaipur',
    });
    expect(result.title_hindi).not.toBeNull();
    expect(result.description_hindi).not.toBeNull();
  });

  it('should parse valid JSON catalog output', () => {
    // Access private method via any cast for unit testing
    const validJson = JSON.stringify({
      title: 'Test Vase',
      description: 'A beautiful vase',
      title_hindi: 'टेस्ट फूलदान',
      description_hindi: 'एक सुंदर फूलदान',
      category: 'Pottery',
      material: 'Clay',
      craft: 'Blue Pottery',
      origin: 'Jaipur',
      region: 'Rajasthan',
      tags: ['vase', 'pottery', 'handmade'],
    });
    const parsed = (service as any).parseAndValidate(validJson);
    expect(parsed.title).toBe('Test Vase');
    expect(parsed.tags).toHaveLength(3);
  });

  it('should reject/sanitize invalid JSON gracefully', () => {
    expect(() => {
      (service as any).parseAndValidate('not valid json at all');
    }).toThrow();
  });

  it('should handle markdown code fences in model output', () => {
    const withFences = '```json\n{"title":"Test","description":"Desc","title_hindi":"टेस्ट","description_hindi":"विवरण","category":null,"material":null,"craft":null,"origin":null,"region":null,"tags":[]}\n```';
    const result = (service as any).parseAndValidate(withFences);
    expect(result.title).toBe('Test');
  });
});

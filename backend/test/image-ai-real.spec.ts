import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ImageAiService } from '../src/ai/image/image-ai.service';
import { ProductMedia, MediaType } from '../src/media/product-media.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
import * as fs from 'fs';
import * as path from 'path';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockMedia = {
  id: 'media-test-1',
  productId: 'prod-test-1',
  mediaType: MediaType.IMAGE,
  originalUrl: '/uploads/products/prod-test-1/original.jpg',
  isProcessed: false,
};

const mockMediaRepo = {
  findOne: jest.fn().mockResolvedValue(mockMedia),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  save: jest.fn().mockResolvedValue(mockMedia),
};

describe('ImageAiService Real Studio Enhancement', () => {
  let service: ImageAiService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
          isGlobal: true,
        }),
      ],
      providers: [
        ImageAiService,
        {
          provide: getRepositoryToken(ProductMedia),
          useValue: mockMediaRepo,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ImageAiService>(ImageAiService);
  });

  it('enhances a real image: returns processedUrl, isMock=false, provider=studio', async () => {
    // 1. Create a real 600x400 artisan product sample image
    const sampleBuffer = await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 3,
        background: { r: 160, g: 100, b: 60 },
      },
    })
      .jpeg()
      .toBuffer();

    // 2. Run enhancement
    const result = await service.enhanceImage({
      mediaId: 'media-test-1',
      imageBuffer: sampleBuffer,
      mimeType: 'image/jpeg',
      productId: 'prod-test-1',
    });

    // 3. Verify returned structure
    expect(result.isMock).toBe(false);
    expect(result.provider).toBe('studio');
    expect(result.processedUrl).toContain('enhanced-media-test-1.png');
    expect(result.processedBase64).toBeDefined();
    expect(result.metadata.improvements).toContain('clean_studio_background');

    // 4. Verify disk file exists and is valid 1024x1024 image
    const diskPath = path.join(
      process.cwd(),
      'uploads',
      'products',
      'prod-test-1',
      'enhanced-media-test-1.png',
    );
    expect(fs.existsSync(diskPath)).toBe(true);

    const outMeta = await sharp(diskPath).metadata();
    expect(outMeta.width).toBe(1024);
    expect(outMeta.height).toBe(1024);
    expect(outMeta.format).toBe('png');

    // 5. Verify DB update was triggered
    expect(mockMediaRepo.update).toHaveBeenCalledWith(
      'media-test-1',
      expect.objectContaining({
        processedUrl: expect.stringContaining('enhanced-media-test-1.png'),
        isProcessed: true,
      }),
    );
  });

  it('rejects oversized files exceeding 20MB', async () => {
    const fakeOversized = Buffer.alloc(21 * 1024 * 1024);
    await expect(
      service.enhanceImage({
        mediaId: 'media-test-2',
        imageBuffer: fakeOversized,
        mimeType: 'image/jpeg',
        productId: 'prod-test-1',
      }),
    ).rejects.toThrow('exceeds maximum allowed size of 20MB');
  });

  it('rejects unsupported file formats', async () => {
    const dummyBuffer = Buffer.from('not an image');
    await expect(
      service.enhanceImage({
        mediaId: 'media-test-3',
        imageBuffer: dummyBuffer,
        mimeType: 'application/pdf',
        productId: 'prod-test-1',
      }),
    ).rejects.toThrow('Unsupported image format');
  });
});

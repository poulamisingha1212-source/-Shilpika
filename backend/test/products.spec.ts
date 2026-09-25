import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Product, ProductStatus } from 'src/products/product.entity';
import { ProductsService } from 'src/products/products.service';
import { ProductsController } from 'src/products/products.controller';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const mockProduct: Partial<Product> = {
  id: 'product-1',
  artisanId: 'artisan-1',
  title: 'Test Pottery Vase',
  status: ProductStatus.DRAFT,
};

const mockProductRepo = {
  create: jest.fn().mockReturnValue(mockProduct),
  save: jest.fn().mockResolvedValue(mockProduct),
  findOne: jest.fn().mockResolvedValue(mockProduct),
  find: jest.fn().mockResolvedValue([mockProduct]),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
  }),
  increment: jest.fn().mockResolvedValue({}),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('should create product with DRAFT status', async () => {
      const product = await service.create('artisan-1', { title: 'Test Vase' });
      expect(mockProductRepo.create).toHaveBeenCalledWith(expect.objectContaining({ artisanId: 'artisan-1', status: ProductStatus.DRAFT }));
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return product by id', async () => {
      const product = await service.findById('product-1');
      expect(product).toEqual(mockProduct);
    });

    it('should throw NotFoundException for unknown id', async () => {
      mockProductRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findById('unknown')).rejects.toThrow('Product not found');
    });
  });

  describe('publish', () => {
    it('should publish product and set publishedAt', async () => {
      const product = await service.publish('product-1', 'artisan-1');
      expect(mockProductRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner', async () => {
      await expect(service.publish('product-1', 'other-artisan')).rejects.toThrow('Not your product');
    });
  });

  describe('search', () => {
    it('should search published products', async () => {
      const result = await service.search('pottery', {}, 1, 20);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
    });
  });
});

describe('Authorization — Product ownership', () => {
  it('artisan cannot modify another artisans product', async () => {
    const mockRepo = {
      ...mockProductRepo,
      findOne: jest.fn().mockResolvedValue({ ...mockProduct, artisanId: 'artisan-1' }),
      save: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockRepo },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();
    const svc = module.get<ProductsService>(ProductsService);
    await expect(svc.update('product-1', 'other-artisan', { title: 'Hack' })).rejects.toThrow('Not your product');
  });
});

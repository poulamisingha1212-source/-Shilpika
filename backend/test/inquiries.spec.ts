import { Test, TestingModule } from "@nestjs/testing";
import { InquiriesService } from "src/inquiries/inquiries.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Inquiry, InquiryStatus } from "src/inquiries/inquiry.entity";
import { Product } from "src/products/product.entity";
import { User, UserRole } from "src/users/user.entity";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const mockProduct = {
  id: "prod-1",
  title: "Blue Pottery Vase",
  artisanId: "artisan-1",
};

const mockBuyer: User = {
  id: "buyer-1",
  email: "buyer@example.com",
  role: UserRole.BUYER,
  displayName: "Test Buyer",
} as any;

const mockArtisan: User = {
  id: "artisan-1",
  email: "artisan@example.com",
  role: UserRole.ARTISAN,
  displayName: "Priya Sharma",
} as any;

const mockOtherUser: User = {
  id: "other-user",
  email: "other@example.com",
  role: UserRole.BUYER,
  displayName: "Other User",
} as any;

const mockInquiry: Inquiry = {
  id: "inq-1",
  buyerId: "buyer-1",
  productId: "prod-1",
  message: "I am interested in buying 5 pieces.",
  status: InquiryStatus.NEW,
  createdAt: new Date(),
  updatedAt: new Date(),
  product: mockProduct as any,
  buyer: mockBuyer,
} as any;

describe("InquiriesService", () => {
  let service: InquiriesService;
  let inquiryRepo: any;
  let productRepo: any;

  beforeEach(async () => {
    inquiryRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...mockInquiry, ...dto })),
      save: jest.fn().mockImplementation((inq) => Promise.resolve(inq)),
      find: jest.fn().mockResolvedValue([mockInquiry]),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where?.id === "inq-1") return Promise.resolve({ ...mockInquiry });
        if (where?.message === "duplicate") return Promise.resolve({ ...mockInquiry, createdAt: new Date() });
        return Promise.resolve(null);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInquiry]),
      }),
    };

    productRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where?.id === "prod-1") return Promise.resolve(mockProduct);
        return Promise.resolve(null);
      }),
      increment: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiriesService,
        { provide: getRepositoryToken(Inquiry), useValue: inquiryRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<InquiriesService>(InquiriesService);
  });

  describe("create", () => {
    it("should successfully create inquiry and increment product inquiry count", async () => {
      inquiryRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockInquiry);

      const result = await service.create("buyer-1", "prod-1", "Hello! Is this still available?");
      expect(result).toBeDefined();
      expect(productRepo.increment).toHaveBeenCalledWith({ id: "prod-1" }, "inquiryCount", 1);
      expect(mockLogger.info).toHaveBeenCalledWith("Inquiry created", expect.any(Object));
    });

    it("should reject message shorter than 5 chars", async () => {
      await expect(service.create("buyer-1", "prod-1", "Hi")).rejects.toThrow(BadRequestException);
    });

    it("should reject if product does not exist", async () => {
      await expect(service.create("buyer-1", "non-existent", "Hello there!")).rejects.toThrow(NotFoundException);
    });

    it("should prevent artisan from sending inquiry on their own product", async () => {
      await expect(service.create("artisan-1", "prod-1", "Hello my own product")).rejects.toThrow(BadRequestException);
    });

    it("should prevent duplicate submissions within 60 seconds", async () => {
      inquiryRepo.findOne.mockResolvedValueOnce({
        id: "recent-1",
        createdAt: new Date(Date.now() - 5000),
      });

      await expect(service.create("buyer-1", "prod-1", "Hello duplicate message")).rejects.toThrow(ConflictException);
    });
  });

  describe("RBAC and Protection", () => {
    it("should return inquiries for artisan's products", async () => {
      const results = await service.findForArtisan("artisan-1");
      expect(results).toHaveLength(1);
    });

    it("should return inquiries for buyer", async () => {
      const results = await service.findByBuyer("buyer-1");
      expect(results).toHaveLength(1);
    });

    it("should automatically transition status from NEW to READ when artisan opens inquiry", async () => {
      inquiryRepo.findOne.mockResolvedValueOnce({
        ...mockInquiry,
        status: InquiryStatus.NEW,
      });

      const viewed = await service.findById("inq-1", mockArtisan);
      expect(viewed.status).toBe(InquiryStatus.READ);
      expect(inquiryRepo.save).toHaveBeenCalled();
    });

    it("should reject unauthorized users trying to view an inquiry", async () => {
      inquiryRepo.findOne.mockResolvedValueOnce({
        ...mockInquiry,
        buyerId: "buyer-1",
        product: { artisanId: "artisan-1" },
      });

      await expect(service.findById("inq-1", mockOtherUser)).rejects.toThrow(ForbiddenException);
    });

    it("artisan can respond to inquiry, updating status to RESPONDED", async () => {
      inquiryRepo.findOne.mockResolvedValueOnce({
        ...mockInquiry,
        product: { artisanId: "artisan-1" },
      });

      const updated = await service.updateStatus("inq-1", InquiryStatus.RESPONDED, mockArtisan, "Yes, we have 5 in stock!");
      expect(updated.status).toBe(InquiryStatus.RESPONDED);
      expect(updated.reply).toBe("Yes, we have 5 in stock!");
      expect(updated.respondedAt).toBeDefined();
    });

    it("buyer cannot reply to their own inquiry as an artisan", async () => {
      inquiryRepo.findOne.mockResolvedValueOnce({
        ...mockInquiry,
        product: { artisanId: "artisan-1" },
      });

      await expect(
        service.updateStatus("inq-1", InquiryStatus.RESPONDED, mockBuyer, "Illegal artisan reply")
      ).rejects.toThrow(ForbiddenException);
    });

    it("buyer can close their own inquiry", async () => {
      inquiryRepo.findOne.mockResolvedValueOnce({
        ...mockInquiry,
        buyerId: "buyer-1",
        product: { artisanId: "artisan-1" },
      });

      const updated = await service.updateStatus("inq-1", InquiryStatus.CLOSED, mockBuyer);
      expect(updated.status).toBe(InquiryStatus.CLOSED);
    });
  });
});

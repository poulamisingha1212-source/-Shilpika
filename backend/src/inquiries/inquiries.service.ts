import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Inquiry, InquiryStatus } from "./inquiry.entity";
import { Product } from "../products/product.entity";
import { User, UserRole } from "../users/user.entity";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) {}

  async create(buyerId: string, productId: string, message: string): Promise<Inquiry> {
    const cleanMsg = (message || "").trim();
    if (!cleanMsg || cleanMsg.length < 5) {
      throw new BadRequestException("Inquiry message must be at least 5 characters long.");
    }

    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ["artisan"],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found.`);
    }

    if (product.artisanId === buyerId) {
      throw new BadRequestException("Artisans cannot send inquiries for their own products.");
    }

    // Duplicate submission prevention (Requirement 11)
    const recentDuplicate = await this.inquiryRepo.findOne({
      where: {
        buyerId,
        productId,
        message: cleanMsg,
      },
      order: { createdAt: "DESC" },
    });

    if (recentDuplicate) {
      const diffMs = Date.now() - new Date(recentDuplicate.createdAt).getTime();
      if (diffMs < 60000) {
        throw new ConflictException(
          "Duplicate inquiry detected. You recently sent an identical message. Please wait before submitting again."
        );
      }
    }

    const inquiry = this.inquiryRepo.create({
      buyerId,
      productId,
      message: cleanMsg,
      status: InquiryStatus.NEW,
    });

    const saved = await this.inquiryRepo.save(inquiry);
    await this.productRepo.increment({ id: productId }, "inquiryCount", 1);
    this.logger.info("Inquiry created", { inquiryId: saved.id, productId, buyerId });

    return (await this.inquiryRepo.findOne({
      where: { id: saved.id },
      relations: ["product", "buyer"],
    }))!;
  }

  async findByBuyer(buyerId: string): Promise<Inquiry[]> {
    return this.inquiryRepo.find({
      where: { buyerId },
      order: { createdAt: "DESC" },
      relations: ["product", "product.artisan"],
    });
  }

  async findForArtisan(artisanId: string): Promise<Inquiry[]> {
    return this.inquiryRepo
      .createQueryBuilder("inquiry")
      .innerJoinAndSelect("inquiry.product", "product")
      .innerJoinAndSelect("inquiry.buyer", "buyer")
      .where("product.artisanId = :artisanId", { artisanId })
      .orderBy("inquiry.createdAt", "DESC")
      .getMany();
  }

  async findAll(): Promise<Inquiry[]> {
    return this.inquiryRepo.find({
      relations: ["product", "buyer"],
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string, user: User): Promise<Inquiry> {
    const inquiry = await this.inquiryRepo.findOne({
      where: { id },
      relations: ["product", "product.artisan", "buyer"],
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID ${id} not found.`);
    }

    const isBuyer = inquiry.buyerId === user.id;
    const isArtisan = inquiry.product?.artisanId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isBuyer && !isArtisan && !isAdmin) {
      throw new ForbiddenException("You do not have permission to view this inquiry.");
    }

    // Automatically transition NEW -> READ when artisan opens the inquiry
    if (isArtisan && inquiry.status === InquiryStatus.NEW) {
      inquiry.status = InquiryStatus.READ;
      await this.inquiryRepo.save(inquiry);
    }

    return inquiry;
  }

  async updateStatus(
    id: string,
    status: InquiryStatus,
    user: User,
    reply?: string
  ): Promise<Inquiry> {
    const inquiry = await this.inquiryRepo.findOne({
      where: { id },
      relations: ["product", "buyer"],
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID ${id} not found.`);
    }

    const isBuyer = inquiry.buyerId === user.id;
    const isArtisan = inquiry.product?.artisanId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isBuyer && !isArtisan && !isAdmin) {
      throw new ForbiddenException("You do not have permission to update this inquiry.");
    }

    // Permission checks per status
    if (status === InquiryStatus.CLOSED) {
      // Both buyer, artisan, and admin can close
    } else if (status === InquiryStatus.RESPONDED || reply) {
      if (!isArtisan && !isAdmin) {
        throw new ForbiddenException("Only the artisan or admin can reply to this inquiry.");
      }
    } else if (status === InquiryStatus.READ) {
      if (!isArtisan && !isAdmin) {
        throw new ForbiddenException("Only the artisan or admin can mark this inquiry as read.");
      }
    }

    if (reply && reply.trim().length > 0) {
      inquiry.reply = reply.trim();
      inquiry.status = InquiryStatus.RESPONDED;
      inquiry.respondedAt = new Date();
    } else {
      inquiry.status = status;
    }

    const updated = await this.inquiryRepo.save(inquiry);
    this.logger.info("Inquiry status updated", {
      inquiryId: updated.id,
      status: updated.status,
      updatedBy: user.id,
    });

    return updated;
  }
}

import { Injectable, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Inquiry } from "./inquiry.entity";
import { Product } from "../products/product.entity";
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
    const inquiry = this.inquiryRepo.create({ buyerId, productId, message });
    const saved = await this.inquiryRepo.save(inquiry);
    await this.productRepo.increment({ id: productId }, "inquiryCount", 1);
    this.logger.info("Inquiry created", { inquiryId: saved.id, productId, buyerId });
    return saved;
  }

  async findByBuyer(buyerId: string): Promise<Inquiry[]> {
    return this.inquiryRepo.find({ where: { buyerId }, order: { createdAt: "DESC" }, relations: ["product"] });
  }

  async findByProduct(productId: string, artisanId: string): Promise<Inquiry[]> {
    return this.inquiryRepo.find({
      where: { productId },
      order: { createdAt: "DESC" },
    });
  }
}

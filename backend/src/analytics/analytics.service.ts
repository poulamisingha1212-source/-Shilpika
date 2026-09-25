import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product, ProductStatus } from "../products/product.entity";
import { Inquiry } from "../inquiries/inquiry.entity";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>
  ) {}

  async getArtisanAnalytics(artisanId: string) {
    const products = await this.productRepo.find({ where: { artisanId } });
    const published = products.filter(p => p.status === ProductStatus.PUBLISHED);
    const drafts = products.filter(p => p.status === ProductStatus.DRAFT);
    const totalViews = products.reduce((sum, p) => sum + p.viewCount, 0);
    const totalInquiries = products.reduce((sum, p) => sum + p.inquiryCount, 0);

    return {
      artisanId,
      totalProducts: products.length,
      publishedProducts: published.length,
      draftProducts: drafts.length,
      totalViews,
      totalInquiries,
      topProducts: published.sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
    };
  }

  async getAdminOverview() {
    const totalProducts = await this.productRepo.count();
    const publishedProducts = await this.productRepo.count({ where: { status: ProductStatus.PUBLISHED } });
    const totalInquiries = await this.inquiryRepo.count();

    return { totalProducts, publishedProducts, totalInquiries };
  }
}

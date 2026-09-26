import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual } from "typeorm";
import { Product, ProductStatus } from "../products/product.entity";
import { Inquiry, InquiryStatus } from "../inquiries/inquiry.entity";
import { User, UserRole } from "../users/user.entity";
import { VoiceInput } from "../ai/voice-input.entity";
import { AIListingVersion } from "../ai/ai-listing-version.entity";
import { PriceRecommendation } from "../pricing/price-recommendation.entity";
import { ProductMedia } from "../media/product-media.entity";

export interface AdminAnalyticsMetrics {
  timeframeDays: number | "all";
  sinceDate?: string;
  activeArtisans: number;
  publishedProducts: number;
  draftProducts: number;
  totalProducts: number;
  catalogCompletionRate: number;
  voiceCompletionRate: number;
  imageEnhancementUsage: {
    totalEnhanced: number;
    enhancementRate: number;
  };
  aiCatalogAcceptanceRate: number;
  priceRecommendationAcceptance: {
    totalRecommendations: number;
    acceptedCount: number;
    acceptanceRate: number;
  };
  buyerInquiries: {
    total: number;
    byStatus: {
      new: number;
      read: number;
      responded: number;
      closed: number;
    };
  };
  productViews: {
    totalViews: number;
    averageViewsPerProduct: number;
  };
  distribution: {
    byRegion: Array<{ region: string; count: number; percentage: number }>;
    byCraft: Array<{ craft: string; count: number; percentage: number }>;
    byCategory: Array<{ category: string; count: number; percentage: number }>;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(VoiceInput) private voiceRepo: Repository<VoiceInput>,
    @InjectRepository(AIListingVersion) private aiVersionRepo: Repository<AIListingVersion>,
    @InjectRepository(PriceRecommendation) private priceRecRepo: Repository<PriceRecommendation>,
    @InjectRepository(ProductMedia) private mediaRepo: Repository<ProductMedia>
  ) {}

  async getArtisanAnalytics(artisanId: string) {
    const products = await this.productRepo.find({ where: { artisanId } });
    const published = products.filter((p) => p.status === ProductStatus.PUBLISHED);
    const drafts = products.filter((p) => p.status === ProductStatus.DRAFT);
    const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    const totalInquiries = products.reduce((sum, p) => sum + (p.inquiryCount || 0), 0);

    return {
      artisanId,
      totalProducts: products.length,
      publishedProducts: published.length,
      draftProducts: drafts.length,
      totalViews,
      totalInquiries,
      topProducts: published.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5),
    };
  }

  async getAdminOverview(daysParam?: string): Promise<AdminAnalyticsMetrics> {
    const validDays = [7, 30, 90];
    const parsedDays = parseInt(daysParam || "30", 10);
    const isAll = daysParam === "all";
    const days: number | "all" = isAll ? "all" : (validDays.includes(parsedDays) ? parsedDays : 30);

    const sinceDate = isAll ? undefined : new Date(Date.now() - (days as number) * 24 * 60 * 60 * 1000);
    const dateFilter = sinceDate ? { createdAt: MoreThanOrEqual(sinceDate) } : {};

    // 1. Products
    const allProducts = await this.productRepo.find({
      where: dateFilter,
      order: { createdAt: "DESC" },
    });

    const totalProducts = allProducts.length;
    const publishedProducts = allProducts.filter((p) => p.status === ProductStatus.PUBLISHED).length;
    const draftProducts = allProducts.filter((p) => p.status === ProductStatus.DRAFT).length;
    const totalViews = allProducts.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    const averageViewsPerProduct = totalProducts > 0 ? Math.round(totalViews / totalProducts) : 0;

    // 2. Active Artisans (distinct artisans with listings + active registered artisan users)
    const distinctProductArtisans = new Set(allProducts.map((p) => p.artisanId).filter(Boolean));
    const activeArtisanUsers = await this.userRepo.find({
      where: { role: UserRole.ARTISAN, isActive: true },
    });
    activeArtisanUsers.forEach((u) => distinctProductArtisans.add(u.id));
    const activeArtisans = distinctProductArtisans.size;

    // 3. Catalog Completion Rate
    // Complete = title, description, category, craft, region, material
    const completeProducts = allProducts.filter(
      (p) => p.title && p.description && p.category && p.craft && p.region && p.material
    ).length;
    const catalogCompletionRate = totalProducts > 0
      ? Math.round((completeProducts / totalProducts) * 1000) / 10
      : 0;

    // 4. Voice Completion Rate
    const voiceInputs = await this.voiceRepo.find({
      where: dateFilter,
    });
    const voiceWithTranscript = voiceInputs.filter((v) => v.transcript && v.transcript.trim().length > 0);
    const productsWithVoice = new Set(voiceWithTranscript.map((v) => v.productId));
    const voiceCompletionRate = totalProducts > 0
      ? Math.min(100, Math.round((productsWithVoice.size / totalProducts) * 1000) / 10)
      : (voiceWithTranscript.length > 0 ? 100 : 0);

    // 5. AI Image Enhancement Usage
    const allMedia = await this.mediaRepo.find({
      where: dateFilter,
    });
    const enhancedMedia = allMedia.filter((m) => m.isProcessed);
    const productsWithEnhancedMedia = new Set(enhancedMedia.map((m) => m.productId));
    const enhancementRate = totalProducts > 0
      ? Math.min(100, Math.round((productsWithEnhancedMedia.size / totalProducts) * 1000) / 10)
      : (enhancedMedia.length > 0 ? 100 : 0);

    // 6. AI Catalog Acceptance Rate
    const aiVersions = await this.aiVersionRepo.find({
      where: dateFilter,
    });
    const approvedVersions = aiVersions.filter((v) => v.approved);
    const aiCatalogAcceptanceRate = aiVersions.length > 0
      ? Math.round((approvedVersions.length / aiVersions.length) * 1000) / 10
      : (totalProducts > 0 ? 100 : 0);

    // 7. Price Recommendation Acceptance
    const priceRecs = await this.priceRecRepo.find({
      where: dateFilter,
    });
    const acceptedPriceRecs = priceRecs.filter((p) => p.artisanAccepted);
    const priceAcceptanceRate = priceRecs.length > 0
      ? Math.round((acceptedPriceRecs.length / priceRecs.length) * 1000) / 10
      : (totalProducts > 0 ? 80 : 0);

    // 8. Buyer Inquiries
    const inquiries = await this.inquiryRepo.find({
      where: dateFilter,
    });
    const inquiryBreakdown = {
      new: inquiries.filter((i) => i.status === InquiryStatus.NEW).length,
      read: inquiries.filter((i) => i.status === InquiryStatus.READ).length,
      responded: inquiries.filter((i) => i.status === InquiryStatus.RESPONDED).length,
      closed: inquiries.filter((i) => i.status === InquiryStatus.CLOSED).length,
    };

    // 9. Regional / Craft / Category Distributions
    const regionCounts: Record<string, number> = {};
    const craftCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const p of allProducts) {
      const reg = p.region || "Unspecified";
      regionCounts[reg] = (regionCounts[reg] || 0) + 1;

      const cr = p.craft || "Unspecified";
      craftCounts[cr] = (craftCounts[cr] || 0) + 1;

      const cat = p.category || "Unspecified";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const byRegion = Object.entries(regionCounts)
      .map(([region, count]) => ({
        region,
        count,
        percentage: totalProducts > 0 ? Math.round((count / totalProducts) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const byCraft = Object.entries(craftCounts)
      .map(([craft, count]) => ({
        craft,
        count,
        percentage: totalProducts > 0 ? Math.round((count / totalProducts) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const byCategory = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalProducts > 0 ? Math.round((count / totalProducts) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      timeframeDays: days,
      sinceDate: sinceDate ? sinceDate.toISOString() : undefined,
      activeArtisans,
      publishedProducts,
      draftProducts,
      totalProducts,
      catalogCompletionRate,
      voiceCompletionRate,
      imageEnhancementUsage: {
        totalEnhanced: enhancedMedia.length,
        enhancementRate,
      },
      aiCatalogAcceptanceRate,
      priceRecommendationAcceptance: {
        totalRecommendations: priceRecs.length,
        acceptedCount: acceptedPriceRecs.length,
        acceptanceRate: priceAcceptanceRate,
      },
      buyerInquiries: {
        total: inquiries.length,
        byStatus: inquiryBreakdown,
      },
      productViews: {
        totalViews,
        averageViewsPerProduct,
      },
      distribution: {
        byRegion,
        byCraft,
        byCategory,
      },
    };
  }
}

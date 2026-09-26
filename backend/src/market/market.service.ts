import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MarketCategory } from "./market-category.entity";
import { MarketSubcategory } from "./market-subcategory.entity";
import { Product, ProductStatus } from "../products/product.entity";
import { VoiceService } from "../ai/voice/voice.service";

export interface MarketProductDto {
  id: string;
  sku: string | null;
  name: string;
  nameHindi: string | null;
  nameBengali: string | null;
  description: string | null;
  imageUrl: string | null;
  categoryName: string | null;
  subcategorySlug: string | null;
  subcategoryName: string | null;
  craft: string | null;
  origin: string | null;
  floorPrice: number | null;
  exportPrice: number | null;
  stock: number | null;
  currency: string;
}

export interface VoiceEnquiryResult {
  answer: string;
  audioBase64?: string;
  ttsProvider: string;
  isMockTts: boolean;
}

@Injectable()
export class MarketService {
  constructor(
    @InjectRepository(MarketCategory) private categoryRepo: Repository<MarketCategory>,
    @InjectRepository(MarketSubcategory) private subcategoryRepo: Repository<MarketSubcategory>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private voiceService: VoiceService,
  ) {}

  async listCategories(): Promise<Array<MarketCategory & { subcategories: MarketSubcategory[] }>> {
    const categories = await this.categoryRepo.find({ order: { sortOrder: "ASC", name: "ASC" } });
    if (categories.length === 0) return [];
    const subcategories = await this.subcategoryRepo.find({ order: { sortOrder: "ASC", name: "ASC" } });
    return categories.map((c) => ({
      ...c,
      subcategories: subcategories.filter((s) => s.categoryId === c.id),
    }));
  }

  async getCategory(slug: string): Promise<MarketCategory & { subcategories: MarketSubcategory[] }> {
    const category = await this.categoryRepo.findOne({ where: { slug } });
    if (!category) throw new NotFoundException(`Category '${slug}' not found`);
    const subcategories = await this.subcategoryRepo.find({
      where: { categoryId: category.id },
      order: { sortOrder: "ASC", name: "ASC" },
    });
    return { ...category, subcategories };
  }

  async getSubcategory(slug: string): Promise<{
    subcategory: MarketSubcategory;
    category: MarketCategory;
    products: MarketProductDto[];
  }> {
    const subcategory = await this.subcategoryRepo.findOne({ where: { slug } });
    if (!subcategory) throw new NotFoundException(`Subcategory '${slug}' not found`);
    const category = await this.categoryRepo.findOne({ where: { id: subcategory.categoryId } });
    const products = await this.listSubcategoryProducts(subcategory.id);
    return { subcategory, category: category!, products };
  }

  async getProductBySku(sku: string): Promise<{
    product: MarketProductDto;
    subcategory: MarketSubcategory | null;
    category: MarketCategory | null;
  }> {
    const product = await this.productRepo.findOne({ where: { sku } });
    if (!product) throw new NotFoundException(`Product '${sku}' not found`);

    let subcategory: MarketSubcategory | null = null;
    let category: MarketCategory | null = null;
    if (product.subcategoryId) {
      subcategory = await this.subcategoryRepo.findOne({ where: { id: product.subcategoryId } });
      if (subcategory) {
        category = await this.categoryRepo.findOne({ where: { id: subcategory.categoryId } });
      }
    }
    return { product: this.toProductDto(product, subcategory, category), subcategory, category };
  }

  /**
   * Authoritative price lookup for order creation — the client never supplies
   * prices. Returns null when the sku does not exist or is not purchasable.
   */
  async getPurchasableProduct(sku: string): Promise<Product | null> {
    const product = await this.productRepo.findOne({
      where: { sku, status: ProductStatus.PUBLISHED },
    });
    return product;
  }

  /**
   * Voice enquiry: builds a strictly grounded answer from live product data
   * (never invents facts), then synthesises speech via ElevenLabs when
   * configured. `question` may come from typed text or from transcription of
   * the user's voice recording done upstream.
   */
  async answerProductEnquiry(
    sku: string,
    question: string | undefined,
    language?: string,
  ): Promise<VoiceEnquiryResult> {
    const { product } = await this.getProductBySku(sku);
    const answer = this.composeGroundedAnswer(product, question || "");
    const speech = await this.voiceService.synthesizeSpeech(answer, language || "en");
    return {
      answer,
      audioBase64: speech.audioBase64,
      ttsProvider: speech.provider,
      isMockTts: speech.isMock,
    };
  }

  private composeGroundedAnswer(p: MarketProductDto, question: string): string {
    const q = question.toLowerCase();
    const inr = (v: number | null) =>
      v == null ? "not set" : `₹${v.toLocaleString("en-IN")}`;
    const availability =
      p.stock == null
        ? "Availability is not tracked for this piece."
        : p.stock > 0
          ? `There ${p.stock === 1 ? "is" : "are"} ${p.stock} unit${p.stock === 1 ? "" : "s"} in stock.`
          : "This piece is currently out of stock.";

    if (/(price|cost|rate|कीमत|दाम|দাম|kimat)/.test(q)) {
      return `${p.name}: the floor price is ${inr(p.floorPrice)} and the export price is ${inr(p.exportPrice)}.`;
    }
    if (/(stock|available|availability|उपलब्ध|পাওয়া)/.test(q)) {
      return `${p.name}: ${availability}`;
    }
    if (/(export|ship|abroad|international|delivery)/.test(q)) {
      return `${p.name} can be ordered at the export price of ${inr(p.exportPrice)} for international delivery. The local floor price is ${inr(p.floorPrice)}. ${availability}`;
    }
    if (/(order|buy|purchase|खरीद|কিনব)/.test(q)) {
      return `You can place an order for ${p.name} on this page. Choose the floor price of ${inr(p.floorPrice)} or the export price of ${inr(p.exportPrice)}, add it to your cart, and place the order. ${availability}`;
    }
    if (/(what|about|describe|detail|craft|क्या|कहानी|কী)/.test(q) || !q.trim()) {
      return `${p.name}. ${p.description || "A handcrafted piece from our curated market collection."} Floor price ${inr(p.floorPrice)}, export price ${inr(p.exportPrice)}. ${availability}`;
    }
    return `I can help with the price, availability and details of ${p.name}. Floor price ${inr(p.floorPrice)}, export price ${inr(p.exportPrice)}. ${availability}`;
  }

  private async listSubcategoryProducts(subcategoryId: string): Promise<MarketProductDto[]> {
    const products = await this.productRepo.find({
      where: { subcategoryId, status: ProductStatus.PUBLISHED },
      order: { createdAt: "ASC" },
    });
    const subcategory = await this.subcategoryRepo.findOne({ where: { id: subcategoryId } });
    const category = subcategory
      ? await this.categoryRepo.findOne({ where: { id: subcategory.categoryId } })
      : null;
    return products.map((p) => this.toProductDto(p, subcategory, category));
  }

  private toProductDto(
    p: Product,
    subcategory: MarketSubcategory | null,
    category: MarketCategory | null,
  ): MarketProductDto {
    return {
      id: p.id,
      sku: p.sku,
      name: p.title || "Untitled piece",
      nameHindi: p.titleHindi ?? null,
      nameBengali: p.titleBengali ?? null,
      description: p.description ?? null,
      imageUrl: p.thumbnailUrl ?? null,
      categoryName: category?.name ?? p.category ?? null,
      subcategorySlug: subcategory?.slug ?? null,
      subcategoryName: subcategory?.name ?? p.craft ?? null,
      craft: p.craft ?? null,
      origin: p.origin ?? null,
      floorPrice: p.floorPrice != null ? Number(p.floorPrice) : null,
      exportPrice: p.exportPrice != null ? Number(p.exportPrice) : null,
      stock: p.stock ?? null,
      currency: p.currency || "INR",
    };
  }
}

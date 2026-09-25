import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions, ILike } from "typeorm";
import { Product, ProductStatus } from "./product.entity";
import { CreateProductDto, UpdateProductDto } from "./dto/create-product.dto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) {}

  async create(artisanId: string, dto: CreateProductDto): Promise<Product> {
    const product = this.productRepo.create({ artisanId, ...dto, status: ProductStatus.DRAFT });
    const saved = await this.productRepo.save(product);
    this.logger.info("Product created", { productId: saved.id, artisanId });
    return saved;
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async findByArtisan(artisanId: string): Promise<Product[]> {
    return this.productRepo.find({ where: { artisanId }, order: { createdAt: "DESC" } });
  }

  async update(id: string, artisanId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    if (product.artisanId !== artisanId) throw new ForbiddenException("Not your product");
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async publish(id: string, artisanId: string): Promise<Product> {
    const product = await this.findById(id);
    if (product.artisanId !== artisanId) throw new ForbiddenException("Not your product");
    product.status = ProductStatus.PUBLISHED;
    product.publishedAt = new Date();
    const saved = await this.productRepo.save(product);
    this.logger.info("Product published", { productId: id, artisanId });
    return saved;
  }

  async search(query?: string, filters?: Record<string, string>, page = 1, limit = 20): Promise<{ data: Product[]; total: number }> {
    const qb = this.productRepo.createQueryBuilder("p")
      .where("p.status = :status", { status: ProductStatus.PUBLISHED });

    if (query) {
      qb.andWhere(
        "(p.title ILIKE :q OR p.description ILIKE :q OR p.tags::text ILIKE :q)",
        { q: `%${query}%` }
      );
    }
    if (filters?.category) qb.andWhere("p.category = :category", { category: filters.category });
    if (filters?.region) qb.andWhere("p.region = :region", { region: filters.region });
    if (filters?.craft) qb.andWhere("p.craft = :craft", { craft: filters.craft });
    if (filters?.material) qb.andWhere("p.material = :material", { material: filters.material });
    if (filters?.minPrice) qb.andWhere("p.priceMin >= :minPrice", { minPrice: Number(filters.minPrice) });
    if (filters?.maxPrice) qb.andWhere("p.priceMax <= :maxPrice", { maxPrice: Number(filters.maxPrice) });

    qb.orderBy("p.publishedAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async incrementView(id: string): Promise<void> {
    await this.productRepo.increment({ id }, "viewCount", 1);
  }
}

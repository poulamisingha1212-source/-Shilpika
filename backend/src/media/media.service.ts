import { Injectable, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { ProductMedia, MediaType } from "./product-media.entity";
import { Product, ProductStatus } from "../products/product.entity";
import { User, UserRole } from "../users/user.entity";
import { v4 as uuidv4 } from "uuid";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

export interface StorageResult {
  originalUrl: string;
  storageKey: string;
  provider: string;
}

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(ProductMedia) private mediaRepo: Repository<ProductMedia>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) {}

  async saveUploadedMedia(
    productId: string,
    file: Express.Multer.File,
    isPrimary = false,
    user?: User
  ): Promise<ProductMedia> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (user && product.artisanId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Not your product - you cannot upload media to another artisan's product");
    }
    const storageMode = this.configService.get("STORAGE_PROVIDER", "local");
    const storageKey = `products/${productId}/${uuidv4()}-${file.originalname}`;

    let originalUrl: string;

    if (storageMode === "gcs") {
      originalUrl = await this.uploadToGcs(storageKey, file);
    } else {
      // Local file storage
      const fs = require('fs');
      const path = require('path');
      const targetDir = path.join(process.cwd(), 'uploads', 'products', productId);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const fullPath = path.join(process.cwd(), 'uploads', storageKey);
      fs.writeFileSync(fullPath, file.buffer);
      originalUrl = `/uploads/${storageKey}`;
    }

    const media = this.mediaRepo.create({
      productId,
      mediaType: MediaType.IMAGE,
      originalUrl,
      isPrimary,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      storageProvider: storageMode,
      storageKey,
      metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    const saved = await this.mediaRepo.save(media);
    this.logger.info("Media saved", { mediaId: saved.id, productId, storageMode, originalUrl });
    return saved;
  }

  async updateProcessedMedia(mediaId: string, processedUrl: string, metadata?: any): Promise<ProductMedia> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!media) throw new Error("Media not found");
    media.processedUrl = processedUrl;
    media.isProcessed = true;
    if (metadata) {
      media.metadata = { ...(media.metadata || {}), ...metadata };
    }
    return this.mediaRepo.save(media);
  }

  async findByProduct(productId: string, user?: User): Promise<ProductMedia[]> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (product.status === ProductStatus.DRAFT) {
      if (!user || (product.artisanId !== user.id && user.role !== UserRole.ADMIN)) {
        throw new ForbiddenException("Cannot access media of another artisan's draft product");
      }
    }
    return this.mediaRepo.find({ where: { productId }, order: { createdAt: "ASC" } });
  }

  private async uploadToGcs(key: string, file: Express.Multer.File): Promise<string> {
    // Real GCS upload - requires: npm install @google-cloud/storage
    // Set GOOGLE_APPLICATION_CREDENTIALS and STORAGE_BUCKET env vars
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Storage } = require("@google-cloud/storage");
      const bucket = this.configService.get("STORAGE_BUCKET");
      const storage = new Storage({ projectId: this.configService.get("GOOGLE_CLOUD_PROJECT") });
      const fileRef = storage.bucket(bucket).file(key);
      await fileRef.save(file.buffer, { contentType: file.mimetype, resumable: false });
      const [signedUrl] = await fileRef.getSignedUrl({
        action: "read",
        expires: Date.now() + 3600 * 1000 * 24 * 7,
      });
      return signedUrl;
    } catch (e) {
      this.logger.warn("GCS upload failed, falling back to mock", { error: e.message });
      return `mock://gcs/${key}`;
    }
  }
}

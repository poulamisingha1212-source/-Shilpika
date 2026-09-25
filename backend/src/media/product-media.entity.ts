import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "../products/product.entity";

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
}

@Entity("product_media")
export class ProductMedia {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  productId: string;

  @Column({ type: "enum", enum: MediaType, default: MediaType.IMAGE })
  mediaType: MediaType;

  @Column({ nullable: true })
  originalUrl: string;

  @Column({ nullable: true })
  processedUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ default: false })
  isProcessed: boolean;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ nullable: true })
  fileSizeBytes: number;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  storageProvider: string;

  @Column({ nullable: true })
  storageKey: string;

  @CreateDateColumn()
  createdAt: Date;
}

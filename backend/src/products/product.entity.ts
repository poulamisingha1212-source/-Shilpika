import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../users/user.entity";

export enum ProductStatus {
  DRAFT = "draft",
  PENDING_REVIEW = "pending_review",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

@Entity("products")
@Index(["status", "category"])
@Index(["status", "region"])
@Index(["artisanId"])
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User)
  @JoinColumn()
  artisan: User;

  @Column({ nullable: true })
  artisanId: string;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ nullable: true })
  titleHindi: string;

  @Column({ nullable: true, type: "text" })
  descriptionHindi: string;

  @Column({ nullable: true })
  titleBengali: string;

  @Column({ nullable: true, type: "text" })
  descriptionBengali: string;

  /** Stable human-readable catalog ID (e.g. DHOKRA-001) used in shareable URLs. */
  @Column({ nullable: true, unique: true })
  sku: string;

  /** Structured market placement: set for curated market catalog products. */
  @Column({ nullable: true })
  subcategoryId: string;

  /** Minimum/local selling price. Never merged with exportPrice. */
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  floorPrice: number;

  /** Export-market price. Never merged with floorPrice. */
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  exportPrice: number;

  /** Units available; null means stock is not tracked for this listing. */
  @Column({ type: "int", nullable: true })
  stock: number;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  material: string;

  @Column({ nullable: true })
  craft: string;

  @Column({ nullable: true })
  origin: string;

  @Column({ nullable: true })
  region: string;

  @Column({ type: "simple-array", nullable: true })
  tags: string[];

  @Column({ nullable: true, type: "text" })
  careInstructions: string;

  @Column({ nullable: true, type: "text" })
  history: string;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ type: "enum", enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  priceMin: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  priceMax: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  aiRecommendedPriceMin: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  aiRecommendedPriceMax: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  inquiryCount: number;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ default: false })
  aiProcessed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  publishedAt: Date;
}

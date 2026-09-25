import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "../products/product.entity";

@Entity("ai_listing_versions")
export class AIListingVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  productId: string;

  @Column({ type: "jsonb", nullable: true })
  generatedFields: Record<string, any>;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  promptVersion: string;

  @Column({ nullable: true })
  provider: string;

  @Column({ default: false })
  approved: boolean;

  @Column({ type: "float", nullable: true })
  latencyMs: number;

  @CreateDateColumn()
  createdAt: Date;
}

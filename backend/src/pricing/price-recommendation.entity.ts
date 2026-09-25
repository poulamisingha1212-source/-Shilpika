import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "../products/product.entity";

@Entity("price_recommendations")
export class PriceRecommendation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  productId: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  rangeMin: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  rangeMax: number;

  @Column({ default: "INR" })
  currency: string;

  @Column({ type: "jsonb", nullable: true })
  factors: string[];

  @Column({ nullable: true })
  dataTimestamp: string;

  @Column({ nullable: true })
  modelVersion: string;

  @Column({ default: false })
  artisanAccepted: boolean;

  @Column({ nullable: true })
  dataAvailability: string;

  @CreateDateColumn()
  createdAt: Date;
}

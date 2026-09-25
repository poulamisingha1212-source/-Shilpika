import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("market_observations")
@Index(["category", "region"])
@Index(["observedAt"])
export class MarketObservation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  craft: string;

  @Column({ nullable: true })
  material: string;

  @Column({ nullable: true })
  region: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  observedPrice: number;

  @Column({ default: "INR" })
  currency: string;

  @Column({ nullable: true })
  source: string;

  @Column({ type: "timestamp", nullable: true })
  observedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

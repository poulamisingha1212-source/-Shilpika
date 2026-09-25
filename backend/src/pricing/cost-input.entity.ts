import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "../products/product.entity";

@Entity("cost_inputs")
export class CostInput {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  productId: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  materialCost: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  laborCost: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  otherCost: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  desiredMarginPercent: number;

  @Column({ default: "INR" })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

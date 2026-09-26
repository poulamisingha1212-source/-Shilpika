import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum PriceType {
  FLOOR = "floor",
  EXPORT = "export",
}

export enum OrderStatus {
  PLACED = "placed",
  CONFIRMED = "confirmed",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

@Entity("orders")
@Index(["userId"])
@Index(["productSku"])
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Human-friendly order reference (e.g. SHP-4F2K9A). */
  @Column({ unique: true })
  orderNumber: string;

  @Column()
  productId: string;

  @Column()
  productSku: string;

  @Column()
  productName: string;

  @Column({ nullable: true })
  productImage: string;

  @Column({ type: "int" })
  quantity: number;

  /** Authoritative unit price resolved server-side from product data. */
  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: "enum", enum: PriceType })
  priceType: PriceType;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ default: "INR" })
  currency: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PLACED })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;
}

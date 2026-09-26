import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../users/user.entity";
import { Product } from "../products/product.entity";

export enum InquiryStatus {
  NEW = "new",
  READ = "read",
  RESPONDED = "responded",
  CLOSED = "closed",
}

@Entity("inquiries")
@Index(["productId"])
@Index(["buyerId"])
export class Inquiry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "buyerId" })
  buyer: User;

  @Column()
  buyerId: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product: Product;

  @Column()
  productId: string;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "varchar", length: 32, default: InquiryStatus.NEW })
  status: InquiryStatus;

  @Column({ nullable: true, type: "text" })
  reply: string;

  @Column({ nullable: true, type: "timestamp" })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

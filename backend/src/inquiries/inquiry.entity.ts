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
  OPEN = "open",
  REPLIED = "replied",
  CLOSED = "closed",
}

@Entity("inquiries")
@Index(["productId"])
@Index(["buyerId"])
export class Inquiry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User)
  @JoinColumn()
  buyer: User;

  @Column()
  buyerId: string;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  productId: string;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "enum", enum: InquiryStatus, default: InquiryStatus.OPEN })
  status: InquiryStatus;

  @Column({ nullable: true, type: "text" })
  reply: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

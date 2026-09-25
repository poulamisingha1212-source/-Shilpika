import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "../products/product.entity";

@Entity("voice_inputs")
export class VoiceInput {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  productId: string;

  @Column({ default: "en" })
  language: string;

  @Column({ nullable: true, type: "text" })
  transcript: string;

  @Column({ nullable: true })
  provider: string;

  @Column({ type: "float", nullable: true })
  confidence: number;

  @Column({ nullable: true })
  audioUrl: string;

  @Column({ nullable: true })
  durationSeconds: number;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum AuctionStatus {
  LIVE = "live",
  ENDED = "ended",
}

@Entity("auction_sessions")
export class AuctionSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  productId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  hindi: string;

  @Column({ nullable: true })
  artForm: string;

  @Column({ nullable: true })
  img: string;

  @Column({ nullable: true })
  lineage: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  reserve: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  currentBid: number;

  @Column({ default: 0 })
  bidCount: number;

  @Column({ default: 0 })
  extensionCount: number;

  @Column({ type: "enum", enum: AuctionStatus, default: AuctionStatus.LIVE })
  status: AuctionStatus;

  @Column({ type: "timestamptz" })
  endsAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

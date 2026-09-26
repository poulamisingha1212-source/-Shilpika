import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { AuctionSession } from "./auction-session.entity";

@Entity("auction_bids")
export class AuctionBid {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => AuctionSession, { onDelete: "CASCADE" })
  @JoinColumn()
  session: AuctionSession;

  @Column({ nullable: true })
  sessionId: string;

  @Column()
  bidder: string;

  @Column({ nullable: true })
  bidderId: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ default: false })
  isBot: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("market_subcategories")
@Index(["categoryId"])
export class MarketSubcategory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  categoryId: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ nullable: true, type: "text" })
  culturalInfo: string;

  /** Owner-configurable YouTube URL (watch or embed form) for this subcategory. */
  @Column({ nullable: true })
  youtubeUrl: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

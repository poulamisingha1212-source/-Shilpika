import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum VerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
}

@Entity("artisan_profiles")
export class ArtisanProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  craftType: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true, type: "text" })
  bio: string;

  @Column({ type: "enum", enum: VerificationStatus, default: VerificationStatus.PENDING })
  verificationStatus: VerificationStatus;

  @Column({ nullable: true })
  gstNumber: string;

  @Column({ nullable: true })
  aadhaarNumber: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: "simple-array", nullable: true })
  craftTags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

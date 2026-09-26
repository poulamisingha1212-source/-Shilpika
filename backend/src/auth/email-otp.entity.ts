import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum OtpPurpose {
  SIGNUP = "signup",
  LOGIN = "login",
}

@Entity("email_otp_codes")
@Index(["email", "purpose"])
export class EmailOtp {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  email: string;

  /** sha256 of the code — the raw code is never stored. */
  @Column()
  codeHash: string;

  @Column({ type: "enum", enum: OtpPurpose })
  purpose: OtpPurpose;

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: "timestamp", nullable: true })
  consumedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

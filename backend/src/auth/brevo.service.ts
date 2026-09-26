import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Inject } from "@nestjs/common";
import { Logger } from "winston";

export interface BrevoSendResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Transactional email via the Brevo (Sendinblue) v3 API. The API key lives
 * only in server env vars and never reaches the client.
 */
@Injectable()
export class BrevoService {
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {
    this.apiKey = this.configService.get<string>("BREVO_API_KEY", "");
    this.senderEmail = this.configService.get<string>("BREVO_SENDER_EMAIL", "questcivic@gmail.com");
    this.senderName = this.configService.get<string>("BREVO_SENDER_NAME", "Shilpika");
  }

  isConfigured(): boolean {
    return !!this.apiKey && !this.apiKey.includes("your_");
  }

  async sendOtpEmail(toEmail: string, code: string, purpose: "signup" | "login", ttlMinutes: number): Promise<BrevoSendResult> {
    if (!this.isConfigured()) {
      return { sent: false, error: "BREVO_API_KEY not configured" };
    }

    const action = purpose === "signup" ? "verify your email" : "sign in";
    const subject = `Shilpika code ${code} — ${action}`;
    const htmlContent = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f6f0e6;border-radius:12px;">
        <h2 style="color:#2b2118;margin:0 0 8px;">Shilpika</h2>
        <p style="color:#5c4f41;margin:0 0 18px;">Use this one-time code to ${action}. It expires in ${ttlMinutes} minutes.</p>
        <div style="background:#fffdf8;border:1px solid #e3d6bf;border-radius:10px;padding:18px;text-align:center;">
          <span style="font-size:32px;letter-spacing:10px;font-weight:700;color:#96500f;">${code}</span>
        </div>
        <p style="color:#7a6a56;font-size:13px;margin:16px 0 0;">
          If you didn't request this, you can safely ignore this email —
          the code can only be used once and expires automatically.
          Never share this code with anyone.
        </p>
      </div>`;

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: toEmail }],
          subject,
          htmlContent,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        this.logger.info("Brevo OTP email sent", { email: toEmail, purpose, messageId: data?.messageId });
        return { sent: true, messageId: data?.messageId };
      }
      const errText = await res.text();
      this.logger.error("Brevo OTP email failed", { status: res.status, err: errText.slice(0, 300) });
      return { sent: false, error: `Brevo API ${res.status}` };
    } catch (err: any) {
      this.logger.error("Brevo OTP email error", { error: err?.message });
      return { sent: false, error: err?.message };
    }
  }
}

import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { MarketService } from "./market.service";
import { VoiceService } from "../ai/voice/voice.service";

class EnquiryDto {
  @IsOptional() @IsString() @MaxLength(1000) question?: string;
  @IsOptional() @IsString() @MaxLength(8_000_000) audioBase64?: string;
  @IsOptional() @IsString() @MaxLength(100) audioMimeType?: string;
  @IsOptional() @IsString() @IsIn(["en", "hi", "bn"]) language?: string;
}

@ApiTags("market")
@Controller("market")
export class MarketController {
  constructor(
    private marketService: MarketService,
    private voiceService: VoiceService,
  ) {}

  @Get("categories")
  @ApiOperation({ summary: "Market categories with their subcategories" })
  listCategories() {
    return this.marketService.listCategories();
  }

  @Get("categories/:slug")
  @ApiOperation({ summary: "One market category with its subcategories" })
  getCategory(@Param("slug") slug: string) {
    return this.marketService.getCategory(slug);
  }

  @Get("subcategories/:slug")
  @ApiOperation({ summary: "Subcategory intro + its product collection" })
  getSubcategory(@Param("slug") slug: string) {
    return this.marketService.getSubcategory(slug);
  }

  @Get("products/:sku")
  @ApiOperation({ summary: "Product detail by stable SKU (authoritative prices)" })
  getProduct(@Param("sku") sku: string) {
    return this.marketService.getProductBySku(sku);
  }

  /**
   * Voice enquiry about a product. Accepts a typed question and/or a voice
   * recording (base64). Voice is transcribed server-side (ElevenLabs Scribe
   * when configured), the answer is composed strictly from live product data,
   * and speech is synthesised server-side so no API key reaches the client.
   */
  @Post("products/:sku/enquiry")
  @ApiOperation({ summary: "Voice/text enquiry about a product (grounded on live data)" })
  async enquiry(@Param("sku") sku: string, @Body() dto: EnquiryDto) {
    let question = dto.question;

    if (!question && dto.audioBase64) {
      const audioBuffer = Buffer.from(dto.audioBase64, "base64");
      const transcript = await this.voiceService.transcribeAudio({
        productId: sku,
        audioBuffer,
        audioMimeType: dto.audioMimeType,
        language: dto.language || "en",
      });
      question = transcript.transcript;
    }

    const result = await this.marketService.answerProductEnquiry(sku, question, dto.language);
    return { ...result, question: question || "" };
  }
}

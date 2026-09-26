import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Param,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from './gemini/gemini.service';
import { VoiceService } from './voice/voice.service';
import { ImageAiService } from './image/image-ai.service';
import { Product } from '../products/product.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IsOptional, IsString } from 'class-validator';

class CatalogGenerateDto {
  @IsString() productId: string;
  @IsOptional() @IsString() transcript?: string;
  @IsOptional() @IsString() imageBase64?: string;
  @IsOptional() @IsString() imageMimeType?: string;
}

class TranscribeDto {
  @IsString() productId: string;
  @IsOptional() @IsString() manualTranscript?: string;
  @IsOptional() @IsString() language?: string;
}

class SynthesizeDto {
  @IsString() text: string;
  @IsOptional() @IsString() language?: string;
}

class ImageEnhanceDto {
  @IsString() mediaId: string;
  @IsString() productId: string;
}

class StoryGenerateDto {
  @IsString() productId: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() craft?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() imageBase64?: string;
  @IsOptional() @IsString() imageMimeType?: string;
}

class TranslateDto {
  @IsString() text: string;
  @IsOptional() @IsString() targetLanguage?: string;
  @IsOptional() @IsString() sourceLanguage?: string;
}

class SaathiDto {
  @IsString() message: string;
  @IsOptional() @IsString() context?: string;
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(ThrottlerGuard)
export class AiController {
  constructor(
    private geminiService: GeminiService,
    private voiceService: VoiceService,
    private imageAiService: ImageAiService,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  private async verifyProductOwnership(productId: string, user: User) {
    if (!productId) return;
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (user && product.artisanId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Not your product - you cannot access or modify another artisan's AI resources");
    }
  }

  @Get('catalog-versions/:productId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get latest AI catalog generation for product (artisan owner only)' })
  async getLatestCatalogVersion(@Param('productId') productId: string, @CurrentUser() user: User) {
    await this.verifyProductOwnership(productId, user);
    return this.geminiService.getLatestVersion(productId);
  }

  @Post('catalog-generate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate structured product catalog using Gemini AI (artisan owner only)' })
  async generateCatalog(@CurrentUser() user: User, @Body() dto: CatalogGenerateDto) {
    await this.verifyProductOwnership(dto.productId, user);
    return this.geminiService.generateCatalog({
      productId: dto.productId,
      transcript: dto.transcript,
      imageBase64: dto.imageBase64,
      imageMimeType: dto.imageMimeType,
    });
  }

  @Post('transcribe')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transcribe voice to text using ElevenLabs (artisan owner only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @CurrentUser() user: User,
    @UploadedFile() audio: Express.Multer.File,
    @Body() dto: TranscribeDto,
  ) {
    await this.verifyProductOwnership(dto.productId, user);
    return this.voiceService.transcribeAudio({
      productId: dto.productId,
      audioBuffer: audio?.buffer,
      audioMimeType: audio?.mimetype,
      manualTranscript: dto.manualTranscript,
      language: dto.language,
    });
  }

  @Post('voice-synthesize')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Synthesize text to speech using ElevenLabs (artisan/admin only)' })
  synthesizeSpeech(@Body() dto: SynthesizeDto) {
    return this.voiceService.synthesizeSpeech(dto.text, dto.language);
  }

  @Post('image-enhance')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enhance product image (artisan owner only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async enhanceImage(
    @CurrentUser() user: User,
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: ImageEnhanceDto,
  ) {
    await this.verifyProductOwnership(dto.productId, user);
    return this.imageAiService.enhanceImage({
      mediaId: dto.mediaId,
      imageBuffer: image?.buffer,
      mimeType: image?.mimetype || 'image/jpeg',
      productId: dto.productId,
    });
  }

  @Post('story-generate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate the cultural story of the artifact using Gemini Vision (artisan owner only)' })
  async generateStory(@CurrentUser() user: User, @Body() dto: StoryGenerateDto) {
    await this.verifyProductOwnership(dto.productId, user);
    let product: Product | null = null;
    if (!dto.title) {
      product = await this.productRepo.findOne({ where: { id: dto.productId } });
    }
    return this.geminiService.generateStory({
      productId: dto.productId,
      title: dto.title || product?.title || 'Handcrafted artisan product',
      craft: dto.craft || product?.craft || undefined,
      region: dto.region || product?.region || undefined,
      imageBase64: dto.imageBase64,
      imageMimeType: dto.imageMimeType,
    });
  }

  @Post('translate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ARTISAN, Role.BUYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate negotiation text (Awaaz Milan, Gemini)' })
  translate(@Body() dto: TranslateDto) {
    return this.geminiService.translateText(dto.text, dto.targetLanguage || 'hi', dto.sourceLanguage);
  }

  @Post('saathi')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Saathi live AI assistant with rate limiting (10 req/min)' })
  saathi(@Body() dto: SaathiDto) {
    return this.geminiService.saathiReply(dto.message, dto.context);
  }
}

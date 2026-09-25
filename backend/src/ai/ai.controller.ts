import {
  Controller,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GeminiService } from './gemini/gemini.service';
import { VoiceService } from './voice/voice.service';
import { ImageAiService } from './image/image-ai.service';
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

@ApiTags('ai')
@Controller('ai')
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@ApiBearerAuth()
export class AiController {
  constructor(
    private geminiService: GeminiService,
    private voiceService: VoiceService,
    private imageAiService: ImageAiService,
  ) {}

  @Post('catalog-generate')
  @ApiOperation({ summary: 'Generate structured product catalog using Gemini AI' })
  generateCatalog(@Body() dto: CatalogGenerateDto) {
    return this.geminiService.generateCatalog({
      productId: dto.productId,
      transcript: dto.transcript,
      imageBase64: dto.imageBase64,
      imageMimeType: dto.imageMimeType,
    });
  }

  @Post('transcribe')
  @ApiOperation({ summary: 'Transcribe voice to text using ElevenLabs' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @UploadedFile() audio: Express.Multer.File,
    @Body() dto: TranscribeDto,
  ) {
    return this.voiceService.transcribeAudio({
      productId: dto.productId,
      audioBuffer: audio?.buffer,
      audioMimeType: audio?.mimetype,
      manualTranscript: dto.manualTranscript,
      language: dto.language,
    });
  }

  @Post('voice-synthesize')
  @ApiOperation({ summary: 'Synthesize text to speech using ElevenLabs' })
  synthesizeSpeech(@Body() dto: SynthesizeDto) {
    return this.voiceService.synthesizeSpeech(dto.text, dto.language);
  }

  @Post('image-enhance')
  @ApiOperation({ summary: 'Enhance product image (background removal, lighting)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async enhanceImage(
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: ImageEnhanceDto,
  ) {
    return this.imageAiService.enhanceImage({
      mediaId: dto.mediaId,
      imageBuffer: image?.buffer,
      mimeType: image?.mimetype || 'image/jpeg',
      productId: dto.productId,
    });
  }
}

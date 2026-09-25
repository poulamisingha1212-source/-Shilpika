import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceInput } from './voice-input.entity';
import { AIListingVersion } from './ai-listing-version.entity';
import { GeminiService } from './gemini/gemini.service';
import { ImageAiService } from './image/image-ai.service';
import { VoiceService } from './voice/voice.service';
import { AiController } from './ai.controller';
import { ProductMedia } from '../media/product-media.entity';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VoiceInput, AIListingVersion, ProductMedia]),
    MediaModule,
  ],
  providers: [GeminiService, ImageAiService, VoiceService],
  controllers: [AiController],
  exports: [GeminiService, ImageAiService, VoiceService],
})
export class AiModule {}

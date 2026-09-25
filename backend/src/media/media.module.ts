import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ProductMedia } from "./product-media.entity";
import { MediaService } from "./media.service";
import { MediaController } from "./media.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductMedia]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async () => ({
        limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
        fileFilter: (req, file, cb) => {
          if (!file.mimetype.match(/^image\/(jpg|jpeg|png|webp|gif)$/)) {
            return cb(new Error("Only image files allowed"), false);
          }
          cb(null, true);
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [MediaService, TypeOrmModule],
})
export class MediaModule {}

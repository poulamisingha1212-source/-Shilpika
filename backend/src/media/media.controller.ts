import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from "@nestjs/swagger";
import { MediaService } from "./media.service";

@ApiTags("media")
@Controller("products")
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post(":id/media")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload product image" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  uploadMedia(
    @Param("id") productId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.mediaService.saveUploadedMedia(productId, file, true);
  }

  @Get(":id/media")
  @ApiOperation({ summary: "Get product media assets" })
  getMedia(@Param("id") productId: string) {
    return this.mediaService.findByProduct(productId);
  }
}

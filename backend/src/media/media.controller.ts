import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from "@nestjs/swagger";
import { MediaService } from "./media.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/user.entity";
import { RolesGuard, Role } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Request } from "express";

@ApiTags("media")
@Controller("products")
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post(":id/media")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload product image (artisan owner only)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  uploadMedia(
    @Param("id") productId: string,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("Image file is required");
    }
    return this.mediaService.saveUploadedMedia(productId, file, true, user);
  }

  @Get(":id/media")
  @ApiOperation({ summary: "Get product media assets" })
  getMedia(@Param("id") productId: string, @Req() req: Request) {
    const user = (req as any).user as User | undefined;
    return this.mediaService.findByProduct(productId, user);
  }
}

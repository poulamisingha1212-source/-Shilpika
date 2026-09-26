import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { InquiriesService } from "./inquiries.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User, UserRole } from "../users/user.entity";
import { InquiryStatus } from "./inquiry.entity";
import { IsString, MinLength, IsEnum, IsOptional } from "class-validator";

class CreateInquiryDto {
  @IsString()
  productId: string;

  @IsString()
  @MinLength(5, { message: "Message must be at least 5 characters long." })
  message: string;
}

class UpdateInquiryStatusDto {
  @IsEnum(InquiryStatus)
  status: InquiryStatus;

  @IsOptional()
  @IsString()
  reply?: string;
}

class ReplyInquiryDto {
  @IsString()
  @MinLength(2, { message: "Reply message must not be empty." })
  reply: string;
}

@ApiTags("inquiries")
@Controller("inquiries")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class InquiriesController {
  constructor(private inquiriesService: InquiriesService) {}

  @Post()
  @ApiOperation({ summary: "Send buyer inquiry to artisan" })
  create(@CurrentUser() user: User, @Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(user.id, dto.productId, dto.message);
  }

  @Get()
  @ApiOperation({ summary: "List inquiries according to caller role (RBAC protected)" })
  list(@CurrentUser() user: User) {
    if (user.role === UserRole.ARTISAN) {
      return this.inquiriesService.findForArtisan(user.id);
    }
    if (user.role === UserRole.ADMIN) {
      return this.inquiriesService.findAll();
    }
    return this.inquiriesService.findByBuyer(user.id);
  }

  @Get("my")
  @ApiOperation({ summary: "Get my sent inquiries (buyer)" })
  myInquiries(@CurrentUser() user: User) {
    return this.inquiriesService.findByBuyer(user.id);
  }

  @Get("received")
  @ApiOperation({ summary: "Get received inquiries for artisan products" })
  receivedInquiries(@CurrentUser() user: User) {
    return this.inquiriesService.findForArtisan(user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get inquiry details by ID (marks READ if artisan)" })
  getOne(@Param("id") id: string, @CurrentUser() user: User) {
    return this.inquiriesService.findById(id, user);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update inquiry status (NEW, READ, RESPONDED, CLOSED)" })
  updateStatus(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateInquiryStatusDto
  ) {
    return this.inquiriesService.updateStatus(id, dto.status, user, dto.reply);
  }

  @Post(":id/reply")
  @ApiOperation({ summary: "Artisan responds to buyer inquiry" })
  reply(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() dto: ReplyInquiryDto
  ) {
    return this.inquiriesService.updateStatus(
      id,
      InquiryStatus.RESPONDED,
      user,
      dto.reply
    );
  }
}

import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { InquiriesService } from "./inquiries.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/user.entity";
import { IsString, MinLength } from "class-validator";

class CreateInquiryDto {
  @IsString() productId: string;
  @IsString() @MinLength(10) message: string;
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

  @Get("my")
  @ApiOperation({ summary: "Get my inquiries (buyer)" })
  myInquiries(@CurrentUser() user: User) {
    return this.inquiriesService.findByBuyer(user.id);
  }
}

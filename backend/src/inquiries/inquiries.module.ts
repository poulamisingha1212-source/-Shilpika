import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Inquiry } from "./inquiry.entity";
import { Product } from "../products/product.entity";
import { InquiriesService } from "./inquiries.service";
import { InquiriesController } from "./inquiries.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry, Product])],
  providers: [InquiriesService],
  controllers: [InquiriesController],
  exports: [InquiriesService],
})
export class InquiriesModule {}

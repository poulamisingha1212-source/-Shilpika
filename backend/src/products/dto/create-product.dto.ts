import { IsOptional, IsString, IsEnum, IsArray, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ProductStatus } from "../product.entity";

export class CreateProductDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() titleHindi?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() descriptionHindi?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() material?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() craft?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() origin?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() region?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsArray() tags?: string[];
}

export class UpdateProductDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() titleHindi?: string;
  @IsOptional() @IsString() descriptionHindi?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() craft?: string;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsNumber() @Type(() => Number) priceMin?: number;
  @IsOptional() @IsNumber() @Type(() => Number) priceMax?: number;
}

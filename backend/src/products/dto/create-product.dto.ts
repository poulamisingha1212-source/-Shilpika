import { IsOptional, IsString, IsEnum, IsArray, IsNumber, IsInt, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ProductStatus } from "../product.entity";

export class CreateProductDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() titleHindi?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() descriptionHindi?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() titleBengali?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() descriptionBengali?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sku?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() subcategoryId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() floorPrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() exportPrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) stock?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() material?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() craft?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() origin?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() region?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsArray() tags?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() careInstructions?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() thumbnailUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() currency?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() titleHindi?: string;
  @IsOptional() @IsString() descriptionHindi?: string;
  @IsOptional() @IsString() titleBengali?: string;
  @IsOptional() @IsString() descriptionBengali?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() subcategoryId?: string;
  @IsOptional() @IsNumber() floorPrice?: number;
  @IsOptional() @IsNumber() exportPrice?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() craft?: string;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() careInstructions?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsNumber() @Type(() => Number) priceMin?: number;
  @IsOptional() @IsNumber() @Type(() => Number) priceMax?: number;
  @IsOptional() @IsNumber() @Type(() => Number) aiRecommendedPriceMin?: number;
  @IsOptional() @IsNumber() @Type(() => Number) aiRecommendedPriceMax?: number;
}

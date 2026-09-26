import { IsIn, IsInt, IsString, Max, MaxLength, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PriceType } from "../order.entity";

export class CreateOrderDto {
  @ApiProperty({ example: "DHOKRA-001" })
  @IsString() @MaxLength(64) productSku: string;

  @ApiProperty({ enum: ["floor", "export"] })
  @IsIn([PriceType.FLOOR, PriceType.EXPORT]) priceType: PriceType;

  @ApiProperty({ minimum: 1, maximum: 99, default: 1 })
  @IsInt() @Min(1) @Max(99) quantity: number;
}

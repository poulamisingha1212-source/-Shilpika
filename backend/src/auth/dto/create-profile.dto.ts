import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../users/user.entity";

export class ArtisanProfileDto {
  @IsOptional() @IsString() craftType?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() bio?: string;
}

export class CreateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString() displayName?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() preferredLanguage?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional() @IsEnum(UserRole) role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional() artisanProfile?: ArtisanProfileDto;
}

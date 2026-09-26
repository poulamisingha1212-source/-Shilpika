import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MarketCategory } from "./market-category.entity";
import { MarketSubcategory } from "./market-subcategory.entity";
import { Product } from "../products/product.entity";
import { MarketService } from "./market.service";
import { MarketController } from "./market.controller";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [TypeOrmModule.forFeature([MarketCategory, MarketSubcategory, Product]), AiModule],
  providers: [MarketService],
  controllers: [MarketController],
  exports: [MarketService],
})
export class MarketModule {}

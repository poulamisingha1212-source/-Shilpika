import { Module } from "@nestjs/common";
import { ProductsModule } from "../products/products.module";
import { MarketplaceController } from "./marketplace.controller";

@Module({
  imports: [ProductsModule],
  controllers: [MarketplaceController],
})
export class MarketplaceModule {}

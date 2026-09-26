import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "./order.entity";
import { Product } from "../products/product.entity";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { MarketModule } from "../market/market.module";

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product]), MarketModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

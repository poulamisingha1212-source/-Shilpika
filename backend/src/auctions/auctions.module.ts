import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuctionSession } from "./auction-session.entity";
import { AuctionBid } from "./auction-bid.entity";
import { Product } from "../products/product.entity";
import { AuctionsService } from "./auctions.service";
import { AuctionsController } from "./auctions.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AuctionSession, AuctionBid, Product])],
  controllers: [AuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}

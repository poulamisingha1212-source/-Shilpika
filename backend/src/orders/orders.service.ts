import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import { Order, OrderStatus, PriceType } from "./order.entity";
import { Product, ProductStatus } from "../products/product.entity";
import { MarketService } from "../market/market.service";
import { User } from "../users/user.entity";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private marketService: MarketService,
  ) {}

  async createFromSku(dto: CreateOrderDto, user: User | null): Promise<Order> {
    // Prices and availability always come from the database — never from the client.
    const product = await this.marketService.getPurchasableProduct(dto.productSku);
    if (!product) throw new NotFoundException(`Product '${dto.productSku}' not found or not purchasable`);

    const unitPrice =
      dto.priceType === PriceType.FLOOR ? product.floorPrice : product.exportPrice;
    if (unitPrice == null) {
      throw new BadRequestException(
        `Product '${dto.productSku}' has no ${dto.priceType} price configured`,
      );
    }
    if (product.stock != null && product.stock < dto.quantity) {
      throw new BadRequestException(
        product.stock <= 0
          ? "This product is currently unavailable"
          : `Only ${product.stock} unit(s) available`,
      );
    }

    const order = this.orderRepo.create({
      orderNumber: this.generateOrderNumber(),
      productId: product.id,
      productSku: product.sku || dto.productSku,
      productName: product.title || dto.productSku,
      productImage: product.thumbnailUrl ?? null,
      quantity: dto.quantity,
      unitPrice: Number(unitPrice),
      priceType: dto.priceType,
      totalAmount: Number(unitPrice) * dto.quantity,
      currency: product.currency || "INR",
      userId: user?.id ?? null,
      customerName: user?.displayName ?? null,
      customerEmail: user?.email ?? null,
      status: OrderStatus.PLACED,
    });
    const saved = await this.orderRepo.save(order);

    if (product.stock != null) {
      product.stock -= dto.quantity;
      await this.productRepo.save(product);
    }
    return saved;
  }

  async listForUser(userId: string): Promise<Order[]> {
    return this.orderRepo.find({ where: { userId }, order: { createdAt: "DESC" } });
  }

  private generateOrderNumber(): string {
    return `SHP-${randomBytes(4).toString("hex").toUpperCase()}`;
  }
}

import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/user.entity";

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Place an order (price resolved server-side from product data)" })
  placeOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: User) {
    return this.ordersService.createFromSku(dto, user ?? null);
  }

  @Get("mine")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Orders placed by the signed-in customer" })
  myOrders(@CurrentUser("id") userId: string) {
    return this.ordersService.listForUser(userId);
  }
}

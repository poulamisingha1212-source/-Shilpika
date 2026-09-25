import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { ProductsService } from "../products/products.service";

@ApiTags("marketplace")
@Controller("marketplace")
export class MarketplaceController {
  constructor(private productsService: ProductsService) {}

  @Get("feed")
  @ApiOperation({ summary: "Marketplace product feed" })
  @ApiQuery({ name: "page", required: false }) @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "category", required: false }) @ApiQuery({ name: "region", required: false })
  @ApiQuery({ name: "craft", required: false }) @ApiQuery({ name: "q", required: false })
  feed(
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("region") region?: string,
    @Query("craft") craft?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number
  ) {
    const filters: Record<string, string> = {};
    if (category) filters.category = category;
    if (region) filters.region = region;
    if (craft) filters.craft = craft;
    return this.productsService.search(q, filters, page, limit);
  }
}

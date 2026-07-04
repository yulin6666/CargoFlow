import { Controller, Get, Post, Body, Param, Query, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PurchaseLabelDto } from './dto/purchase-label.dto';

@Controller('api/shipments')
export class ShipmentsController {
  private readonly logger = new Logger(ShipmentsController.name);

  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async createQuote(@Body() createQuoteDto: CreateQuoteDto) {
    this.logger.log(`POST /api/shipments/quote - ${JSON.stringify(createQuoteDto)}`);
    return this.shipmentsService.createQuote(createQuoteDto);
  }

  @Post(':id/purchase-label')
  @HttpCode(HttpStatus.OK)
  async purchaseLabel(
    @Param('id') id: string,
    @Body() purchaseLabelDto: PurchaseLabelDto,
  ) {
    this.logger.log(`POST /api/shipments/${id}/purchase-label`);
    return this.shipmentsService.purchaseLabel(+id, purchaseLabelDto);
  }

  @Get()
  async listShipments(
    @Query('token_code') tokenCode?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(`GET /api/shipments - token_code=${tokenCode}, status=${status}`);
    return this.shipmentsService.listShipments({
      tokenCode,
      status,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get(':id')
  async getShipment(@Param('id') id: string) {
    this.logger.log(`GET /api/shipments/${id}`);
    return this.shipmentsService.getShipmentById(+id);
  }

  @Get(':id/logs')
  async getShipmentLogs(@Param('id') id: string) {
    this.logger.log(`GET /api/shipments/${id}/logs`);
    return this.shipmentsService.getShipmentLogs(+id);
  }
}

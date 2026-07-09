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
    this.logger.log(`POST /api/shipments/quote`);
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

  @Post(':id/mock-payment')
  @HttpCode(HttpStatus.OK)
  async mockPayment(@Param('id') id: string) {
    this.logger.log(`POST /api/shipments/${id}/mock-payment`);
    return this.shipmentsService.mockPayment(+id);
  }

  @Get()
  async listShipments(
    @Query('token_code') tokenCode?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.shipmentsService.listShipments({
      tokenCode,
      status,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get(':id')
  async getShipment(@Param('id') id: string) {
    return this.shipmentsService.getShipmentById(+id);
  }

  @Get(':id/logs')
  async getShipmentLogs(@Param('id') id: string) {
    return this.shipmentsService.getShipmentLogs(+id);
  }

  @Post(':id/simulate-tracking-update')
  @HttpCode(HttpStatus.OK)
  async simulateTrackingUpdate(
    @Param('id') id: string,
    @Body() body: { status: string; trackingNumber: string },
  ) {
    this.logger.log(`POST /api/shipments/${id}/simulate-tracking-update`);
    this.logger.log(`Received body: ${JSON.stringify(body)}`);
    return this.shipmentsService.simulateTrackingUpdate(+id, body.status, body.trackingNumber);
  }
}

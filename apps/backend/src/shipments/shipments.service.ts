import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PurchaseLabelDto } from './dto/purchase-label.dto';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);
  private readonly n8nBaseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.n8nBaseUrl = process.env.N8N_WEBHOOK_BASE || 'http://localhost:5678';
  }

  async createQuote(createQuoteDto: CreateQuoteDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.n8nBaseUrl}/webhook/generate-quote`,
          createQuoteDto,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create quote', error);
      throw new HttpException(
        error.response?.data || 'Failed to create quote',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async purchaseLabel(shipmentId: number, purchaseLabelDto: PurchaseLabelDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.n8nBaseUrl}/webhook/purchase-label`,
          {
            shipmentId,
            ...purchaseLabelDto,
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to purchase label', error);
      throw new HttpException(
        error.response?.data || 'Failed to purchase label',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listShipments(params: {
    tokenCode?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const queryParams = new URLSearchParams();
      if (params.tokenCode) queryParams.append('token_code', params.tokenCode);
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.n8nBaseUrl}/webhook/shipments?${queryParams.toString()}`,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to list shipments', error);
      throw new HttpException(
        error.response?.data || 'Failed to list shipments',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getShipmentById(id: number) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.n8nBaseUrl}/webhook/shipment/${id}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get shipment ${id}`, error);
      throw new HttpException(
        error.response?.data || 'Shipment not found',
        error.response?.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  async getShipmentLogs(id: number) {
    try {
      const shipmentData = await this.getShipmentById(id);
      return {
        success: true,
        logs: shipmentData.logs || [],
      };
    } catch (error) {
      this.logger.error(`Failed to get logs for shipment ${id}`, error);
      throw new HttpException(
        error.response?.data || 'Failed to get shipment logs',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Kept for backward compatibility
  async getAllShipments() {
    return this.listShipments({});
  }
}

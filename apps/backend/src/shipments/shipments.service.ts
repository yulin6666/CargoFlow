import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PurchaseLabelDto } from './dto/purchase-label.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);
  private readonly n8nBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.n8nBaseUrl = process.env.N8N_WEBHOOK_BASE || 'http://localhost:5678';
  }

  async createQuote(createQuoteDto: CreateQuoteDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.n8nBaseUrl}/webhook/generate-quote`, createQuoteDto),
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
        this.httpService.post(`${this.n8nBaseUrl}/webhook/purchase-label`, {
          shipmentId,
          ...purchaseLabelDto,
        }),
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

  async mockPayment(shipmentId: number) {
    try {
      const shipmentData = await this.getShipmentById(shipmentId);
      const shipment = shipmentData.shipment;
      if (!shipment) throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);

      const response = await firstValueFrom(
        this.httpService.post(`${this.n8nBaseUrl}/webhook/stripe-payment-webhook`, {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: `mock_pi_${Date.now()}`,
              amount: Math.round((Number(shipment.quoteAmount) || 0) * 100),
              currency: 'usd',
              receipt_email: shipment.senderEmail || '',
              metadata: {
                shipment_id: String(shipmentId),
                customer_email: shipment.senderEmail || '',
              },
            },
          },
        }),
      );
      return { success: true, message: '模拟支付成功', ...response.data };
    } catch (error) {
      this.logger.error('Failed to trigger mock payment', error);
      throw new HttpException(
        error.response?.data || 'Failed to mock payment',
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
      const where: any = {};
      if (params.tokenCode) where.tokenCode = params.tokenCode;
      if (params.status) where.status = params.status;

      const shipments = await this.prisma.demoShipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      });

      return {
        success: true,
        data: shipments,
        count: shipments.length,
      };
    } catch (error) {
      this.logger.error('Failed to list shipments', error);
      throw new HttpException(
        'Failed to list shipments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getShipmentById(id: number) {
    try {
      const shipment = await this.prisma.demoShipment.findUnique({
        where: { id },
      });

      if (!shipment) {
        throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
      }

      const logs = await this.prisma.automationLog.findMany({
        where: { shipmentId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return {
        success: true,
        shipment,
        logs,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get shipment ${id}`, error);
      throw new HttpException(
        'Shipment not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async getShipmentLogs(id: number) {
    try {
      const shipmentData = await this.getShipmentById(id);
      return { success: true, logs: shipmentData.logs || [] };
    } catch (error) {
      this.logger.error(`Failed to get logs for shipment ${id}`, error);
      throw new HttpException(
        error.response?.data || 'Failed to get shipment logs',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllShipments() {
    return this.listShipments({});
  }

  async simulateTrackingUpdate(shipmentId: number, status: string, trackingNumber: string) {
    this.logger.log(`simulateTrackingUpdate called: shipmentId=${shipmentId}, status=${status}, trackingNumber=${JSON.stringify(trackingNumber)}`);
    if (!trackingNumber) {
      this.logger.error(`trackingNumber is empty/undefined for shipmentId=${shipmentId}`);
      throw new HttpException('trackingNumber is required', HttpStatus.BAD_REQUEST);
    }
    try {
      const mockWebhookPayload = {
        event: 'tracking_status_updated',
        data: {
          tracking_number: trackingNumber,
          status: status,
          substatus: { text: `Simulated ${status}` },
          carrier: 'USPS',
          eta: null,
          tracking_history: [],
          location: {},
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.n8nBaseUrl}/webhook/shippo-tracking-webhook`, mockWebhookPayload),
      );
      this.logger.log(`n8n webhook response: ${JSON.stringify(response.data)}`);

      return { success: true, message: `模拟 ${status} webhook 已发送`, webhookResponse: response.data };
    } catch (error) {
      this.logger.error(`Failed to simulate tracking update for shipment ${shipmentId}`, error);
      throw new HttpException(
        error.response?.data || 'Failed to simulate tracking update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

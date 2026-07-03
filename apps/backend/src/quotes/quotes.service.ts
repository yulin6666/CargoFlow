import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@cargoflow/database';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
  private readonly n8nWebhookBase: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.n8nWebhookBase = this.configService.get<string>(
      'N8N_WEBHOOK_BASE',
      'http://localhost:5678',
    );
  }

  async createQuote(createQuoteDto: CreateQuoteDto) {
    this.logger.log(
      `Creating quote: ${createQuoteDto.fromAddress} -> ${createQuoteDto.toAddress}`,
    );

    try {
      // 调用 n8n webhook
      const n8nUrl = `${this.n8nWebhookBase}/webhook/generate-quote`;
      this.logger.debug(`Calling n8n webhook: ${n8nUrl}`);

      const response = await firstValueFrom(
        this.httpService.post(n8nUrl, createQuoteDto),
      );

      this.logger.log(`n8n response: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create quote: ${error.message}`);

      // 如果 n8n 调用失败，返回 fallback 响应
      this.logger.warn('n8n webhook failed, creating local record');

      const shipment = await prisma.demoShipment.create({
        data: {
          fromAddress: createQuoteDto.fromAddress,
          toAddress: createQuoteDto.toAddress,
          weight: createQuoteDto.weight,
          status: 'draft',
          quoteAmount: null,
        },
      });

      return {
        success: false,
        error: 'n8n webhook not available',
        shipmentId: shipment.id,
        message:
          'Quote created locally. Please configure n8n workflow to generate pricing.',
      };
    }
  }

  async getAllShipments() {
    return prisma.demoShipment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShipmentById(id: number) {
    return prisma.demoShipment.findUnique({
      where: { id },
    });
  }
}

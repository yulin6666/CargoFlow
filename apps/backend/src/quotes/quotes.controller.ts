import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Controller('api/quotes')
export class QuotesController {
  private readonly logger = new Logger(QuotesController.name);

  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  async create(@Body() createQuoteDto: CreateQuoteDto) {
    this.logger.log(`POST /api/quotes - ${JSON.stringify(createQuoteDto)}`);
    return this.quotesService.createQuote(createQuoteDto);
  }

  @Get()
  async findAll() {
    this.logger.log('GET /api/quotes');
    return this.quotesService.getAllShipments();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /api/quotes/${id}`);
    return this.quotesService.getShipmentById(+id);
  }
}

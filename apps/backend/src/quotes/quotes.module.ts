import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  imports: [HttpModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}

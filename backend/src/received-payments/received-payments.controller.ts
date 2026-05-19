import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ReceivedPaymentsService } from './received-payments.service';

@Controller('received')
export class ReceivedPaymentsController {
  constructor(private readonly receivedService: ReceivedPaymentsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return await this.receivedService.findAll(status, search);
  }

  @Post()
  async create(
    @Body('id') id?: string,
    @Body('amount') amount?: number,
    @Body('channel') channel?: string,
    @Body('provider') provider?: string,
    @Body('reference') reference?: string,
    @Body('narrative') narrative?: string,
    @Body('senderName') senderName?: string,
    @Body('senderAccount') senderAccount?: string,
    @Body('createdAt') createdAt?: string,
  ) {
    return await this.receivedService.create({
      id,
      amount: amount ? Number(amount) : 0,
      channel: channel || '',
      provider: provider || '',
      reference: reference || '',
      narrative,
      senderName,
      senderAccount,
      createdAt,
    });
  }

  @Post('csv')
  async importCsv(@Body('csvText') csvText: string) {
    return await this.receivedService.importCsv(csvText);
  }
}

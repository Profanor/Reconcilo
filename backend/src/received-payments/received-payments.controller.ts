import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ReceivedPaymentsService } from './received-payments.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../auth/tenant.decorator';

@ApiTags('Received Payments')
@Controller('received')
export class ReceivedPaymentsController {
  constructor(private readonly receivedService: ReceivedPaymentsService) {}

  @Get()
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter payments by matching status (e.g. UNMATCHED, MATCHED)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Search string matching reference, sender name, or bank narrative',
  })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return await this.receivedService.findAll(tenantId, status, search);
  }

  @Post()
  async create(
    @CurrentTenant() tenantId: string,
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
    return await this.receivedService.create(tenantId, {
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
  async importCsv(
    @CurrentTenant() tenantId: string,
    @Body('csvText') csvText: string,
  ) {
    return await this.receivedService.importCsv(tenantId, csvText);
  }
}

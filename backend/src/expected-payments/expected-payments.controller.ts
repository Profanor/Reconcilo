import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { ExpectedPaymentsService } from './expected-payments.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Expected Payments')
@Controller('expected')
export class ExpectedPaymentsController {
  constructor(private readonly expectedService: ExpectedPaymentsService) {}

  @Get()
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter payments by matching status (e.g. PENDING, MATCHED)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Search string matching reference number, name, email, or phone',
  })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return await this.expectedService.findAll(status, search);
  }

  @Post()
  async create(
    @Body('id') id?: string,
    @Body('amount') amount?: number,
    @Body('reference') reference?: string,
    @Body('customerName') customerName?: string,
    @Body('customerPhone') customerPhone?: string,
    @Body('customerEmail') customerEmail?: string,
    @Body('dueDate') dueDate?: string,
    @Body('description') description?: string,
  ) {
    return await this.expectedService.create({
      id,
      amount: amount ? Number(amount) : 0,
      reference: reference || '',
      customerName: customerName || '',
      customerPhone,
      customerEmail,
      dueDate,
      description,
    });
  }

  @Post('csv')
  async importCsv(
    @Body('csvText') csvText: string,
    @Body('actor') actor?: string,
  ) {
    return await this.expectedService.importCsv(csvText, actor);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.expectedService.remove(id);
  }
}

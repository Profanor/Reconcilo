import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { RulesService } from './rules.service';
import { CurrentTenant } from '../auth/tenant.decorator';

@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    return await this.rulesService.findAll(tenantId);
  }

  @Put(':id')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('isActive') isActive?: boolean,
    @Body('priority') priority?: number,
    @Body('config') config?: any,
  ) {
    return await this.rulesService.update(tenantId, id, {
      isActive,
      priority,
      config,
    });
  }
}

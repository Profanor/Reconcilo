import { Controller, Get } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { CurrentTenant } from "../auth/tenant.decorator";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  async getStats(@CurrentTenant() tenantId: string) {
    return await this.dashboardService.getStats(tenantId);
  }
}

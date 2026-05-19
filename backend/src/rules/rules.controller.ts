import { Controller, Get, Put, Body, Param } from "@nestjs/common";
import { RulesService } from "./rules.service";

@Controller("rules")
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  async findAll() {
    return await this.rulesService.findAll();
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body("isActive") isActive?: boolean,
    @Body("priority") priority?: number,
    @Body("config") config?: any
  ) {
    return await this.rulesService.update(id, {
      isActive,
      priority,
      config,
    });
  }
}

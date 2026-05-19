import { Controller, Get, Post, Delete, Body, Query, Param } from "@nestjs/common";
import { ExpectedPaymentsService } from "./expected-payments.service";

@Controller("expected")
export class ExpectedPaymentsController {
  constructor(private readonly expectedService: ExpectedPaymentsService) {}

  @Get()
  async findAll(
    @Query("status") status?: string,
    @Query("search") search?: string
  ) {
    return await this.expectedService.findAll(status, search);
  }

  @Post()
  async create(
    @Body("id") id?: string,
    @Body("amount") amount?: number,
    @Body("reference") reference?: string,
    @Body("customerName") customerName?: string,
    @Body("customerPhone") customerPhone?: string,
    @Body("customerEmail") customerEmail?: string,
    @Body("dueDate") dueDate?: string,
    @Body("description") description?: string
  ) {
    return await this.expectedService.create({
      id,
      amount: amount ? Number(amount) : 0,
      reference: reference || "",
      customerName: customerName || "",
      customerPhone,
      customerEmail,
      dueDate,
      description,
    });
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return await this.expectedService.remove(id);
  }
}

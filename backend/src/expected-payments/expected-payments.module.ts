import { Module } from '@nestjs/common';
import { ExpectedPaymentsService } from './expected-payments.service';
import { ExpectedPaymentsController } from './expected-payments.controller';

@Module({
  controllers: [ExpectedPaymentsController],
  providers: [ExpectedPaymentsService],
  exports: [ExpectedPaymentsService],
})
export class ExpectedPaymentsModule {}

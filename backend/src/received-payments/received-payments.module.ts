import { Module } from '@nestjs/common';
import { ReceivedPaymentsService } from './received-payments.service';
import { ReceivedPaymentsController } from './received-payments.controller';

@Module({
  controllers: [ReceivedPaymentsController],
  providers: [ReceivedPaymentsService],
  exports: [ReceivedPaymentsService],
})
export class ReceivedPaymentsModule {}

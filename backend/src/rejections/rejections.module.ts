import { Module } from '@nestjs/common';
import { RejectionsService } from './rejections.service';
import { RejectionsController } from './rejections.controller';

@Module({
  providers: [RejectionsService],
  controllers: [RejectionsController],
  exports: [RejectionsService],
})
export class RejectionsModule {}

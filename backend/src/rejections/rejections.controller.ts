import { Controller, Get, Param, Query } from '@nestjs/common';
import { RejectionsService, QueryRejectionsDto } from './rejections.service';
import { Public } from '../auth/guards/public.decorator';

@Controller('rejections')
export class RejectionsController {
  constructor(private readonly rejectionsService: RejectionsService) {}

  @Public()
  @Get()
  async getRejections(@Query() query: QueryRejectionsDto) {
    return this.rejectionsService.findRejections(query);
  }

  @Public()
  @Get('reasons')
  async getReasons() {
    return this.rejectionsService.getDistinctReasons();
  }

  @Public()
  @Get(':id')
  async getRejectionById(@Param('id') id: string) {
    return this.rejectionsService.getRejectionById(id);
  }
}

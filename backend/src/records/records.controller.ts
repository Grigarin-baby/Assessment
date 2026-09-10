import { Controller, Get, Param, Query } from '@nestjs/common';
import { RecordsService, QueryRecordsDto } from './records.service';
import { Public } from '../auth/guards/public.decorator';

@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Public()
  @Get()
  async getRecords(@Query() query: QueryRecordsDto) {
    return this.recordsService.findRecords(query);
  }

  @Public()
  @Get('sources')
  async getSources() {
    return this.recordsService.getDistinctSources();
  }

  @Public()
  @Get(':id')
  async getRecordById(@Param('id') id: string) {
    return this.recordsService.getRecordById(id);
  }
}

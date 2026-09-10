import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
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
    const record = await this.recordsService.getRecordById(id);
    if (!record) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }
    return record;
  }

  @Public()
  @Get(':id/history')
  async getRecordHistory(@Param('id') id: string) {
    const history = await this.recordsService.getRecordHistory(id);
    if (!history) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }
    return history;
  }
}

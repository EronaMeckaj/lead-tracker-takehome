import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { QueryLeadsDto } from './dto/query-leads.dto.js';
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto.js';
import { LeadSource } from './entities/lead.entity.js';
import { LeadsService } from './leads.service.js';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto, LeadSource.FORM);
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  findAll(@Query() query: QueryLeadsDto) {
    return this.leadsService.findAll(query);
  }

  @Patch(':id/stage')
  @UseGuards(SessionAuthGuard)
  updateStage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadStageDto) {
    return this.leadsService.updateStage(id, dto.stage);
  }
}

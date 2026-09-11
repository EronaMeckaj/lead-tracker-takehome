import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { QueryLeadsDto } from './dto/query-leads.dto.js';
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
  findAll(@Query() query: QueryLeadsDto) {
    return this.leadsService.findAll(query);
  }
}

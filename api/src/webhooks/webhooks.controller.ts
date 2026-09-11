import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateLeadDto } from '../leads/dto/create-lead.dto.js';
import { LeadSource } from '../leads/entities/lead.entity.js';
import { LeadsService } from '../leads/leads.service.js';
import { RateLimit } from '../rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard.js';
import { WebhookSecretGuard } from './webhook-secret.guard.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('leads')
  @UseGuards(RateLimitGuard, WebhookSecretGuard)
  @RateLimit({ limit: 30, windowSeconds: 60 })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto, LeadSource.WEBHOOK);
  }
}

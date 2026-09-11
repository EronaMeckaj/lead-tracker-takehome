import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module.js';
import { WebhookSecretGuard } from './webhook-secret.guard.js';
import { WebhooksController } from './webhooks.controller.js';

@Module({
  imports: [LeadsModule],
  controllers: [WebhooksController],
  providers: [WebhookSecretGuard],
})
export class WebhooksModule {}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-webhook-secret'];
    const expected = this.configService.getOrThrow<string>('WEBHOOK_SECRET');

    if (provided !== expected) {
      throw new ForbiddenException('Invalid webhook secret');
    }
    return true;
  }
}

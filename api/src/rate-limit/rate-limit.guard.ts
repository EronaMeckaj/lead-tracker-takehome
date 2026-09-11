import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis/redis.module.js';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator.js';

const DEFAULT_OPTIONS: RateLimitOptions = { limit: 10, windowSeconds: 60 };

/**
 * Fixed-window rate limit backed by Valkey: INCR a per-route-per-IP
 * counter, set its expiry on the first hit in the window, reject once
 * the counter passes the configured limit.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options =
      this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler()) ??
      DEFAULT_OPTIONS;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const routeKey = `${request.method}:${request.route?.path ?? request.path}`;
    const key = `ratelimit:${routeKey}:${request.ip}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, options.windowSeconds);
    }

    if (count > options.limit) {
      const ttl = await this.redis.ttl(key);
      response.setHeader('Retry-After', String(Math.max(ttl, 1)));
      throw new HttpException(
        'Too many requests, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window size, in seconds. */
  windowSeconds: number;
}

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

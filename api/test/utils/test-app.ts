import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { RedisClientType } from 'redis';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { REDIS_CLIENT } from '../../src/redis/redis.module.js';
import { SessionAuthGuard } from '../../src/auth/session-auth.guard.js';

export interface TestAppContext {
  app: INestApplication;
  dataSource: DataSource;
  redisClient: RedisClientType;
}

export interface CreateTestAppOptions {
  /**
   * Bypasses SessionAuthGuard instead of exercising a real Google OAuth +
   * session round trip, which can't be automated without live credentials.
   * The guard's own reject-when-anonymous behavior is covered separately,
   * unmocked, by specs that don't set this - this only lets specs that
   * need to be "logged in" exercise their real Postgres-backed logic.
   */
  authenticated?: boolean;
}

/** Boots the real app (real Postgres + Valkey) the same way main.ts does. */
export async function createTestApp(options: CreateTestAppOptions = {}): Promise<TestAppContext> {
  const moduleBuilder = Test.createTestingModule({ imports: [AppModule] });

  if (options.authenticated) {
    moduleBuilder.overrideGuard(SessionAuthGuard).useValue({ canActivate: () => true });
  }

  const moduleFixture = await moduleBuilder.compile();
  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return {
    app,
    dataSource: moduleFixture.get(DataSource),
    redisClient: moduleFixture.get<RedisClientType>(REDIS_CLIENT),
  };
}

/** Clears leads and rate-limit counters between tests so specs don't leak into each other. */
export async function resetState(ctx: TestAppContext): Promise<void> {
  await ctx.dataSource.query('TRUNCATE TABLE leads RESTART IDENTITY CASCADE');
  await ctx.redisClient.flushDb();
}

export async function closeTestApp(ctx: TestAppContext): Promise<void> {
  await ctx.app.close();
}

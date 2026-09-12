import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import passport from 'passport';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from './redis/redis.module.js';

/**
 * Everything the app needs before it can serve a request - global prefix,
 * validation, CORS, and the session/passport middleware chain. Shared by
 * main.ts and the e2e test harness so tests exercise the exact same stack
 * production runs, not a hand-approximated copy of it.
 */
export function configureApp(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);
  const isProduction = configService.get('NODE_ENV') === 'production';

  // Render sits in front of the app as a reverse proxy; without this,
  // every request's req.ip is the proxy's address, and per-IP rate
  // limiting collapses onto a single shared bucket.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200',
    credentials: true,
  });

  const redisClient = app.get<RedisClientType>(REDIS_CLIENT);
  app.use(
    session({
      store: new RedisStore({ client: redisClient, prefix: 'sess:' }),
      secret: configService.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
}

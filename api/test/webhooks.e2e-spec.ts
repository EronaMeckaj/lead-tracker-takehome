import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types';
import { closeTestApp, createTestApp, resetState, TestAppContext } from './utils/test-app.js';

describe('Webhooks (e2e)', () => {
  let ctx: TestAppContext;
  let webhookSecret: string;
  const payload = { name: 'External Lead', email: 'ext@example.com', message: 'via webhook' };

  beforeAll(async () => {
    ctx = await createTestApp();
    webhookSecret = ctx.app.get(ConfigService).getOrThrow<string>('WEBHOOK_SECRET');
  });
  beforeEach(async () => {
    await resetState(ctx);
  });
  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('rejects a request with no secret header', async () => {
    await request(ctx.app.getHttpServer() as App)
      .post('/api/webhooks/leads')
      .send(payload)
      .expect(403);
  });

  it('rejects a request with the wrong secret', async () => {
    await request(ctx.app.getHttpServer() as App)
      .post('/api/webhooks/leads')
      .set('X-Webhook-Secret', 'wrong-secret')
      .send(payload)
      .expect(403);
  });

  it('creates a webhook-sourced lead when the secret matches', async () => {
    const res = await request(ctx.app.getHttpServer() as App)
      .post('/api/webhooks/leads')
      .set('X-Webhook-Secret', webhookSecret)
      .send(payload)
      .expect(201);

    expect(res.body).toMatchObject({ source: 'webhook', stage: 'new', email: 'ext@example.com' });
  });

  it('rejects an invalid payload same as the public form', async () => {
    await request(ctx.app.getHttpServer() as App)
      .post('/api/webhooks/leads')
      .set('X-Webhook-Secret', webhookSecret)
      .send({ name: '', email: 'not-an-email', message: '' })
      .expect(400);
  });

  it('rate-limits after 30 requests in a window', async () => {
    const server = ctx.app.getHttpServer() as App;

    for (let i = 0; i < 30; i++) {
      await request(server)
        .post('/api/webhooks/leads')
        .set('X-Webhook-Secret', webhookSecret)
        .send(payload)
        .expect(201);
    }

    const res = await request(server)
      .post('/api/webhooks/leads')
      .set('X-Webhook-Secret', webhookSecret)
      .send(payload)
      .expect(429);
    expect(res.headers['retry-after']).toBeDefined();
  }, 20000);
});

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { closeTestApp, createTestApp, resetState, TestAppContext } from './utils/test-app.js';

describe('Leads (e2e)', () => {
  describe('public form', () => {
    let ctx: TestAppContext;

    beforeAll(async () => {
      ctx = await createTestApp();
    });
    beforeEach(async () => {
      await resetState(ctx);
    });
    afterAll(async () => {
      await closeTestApp(ctx);
    });

    it('creates a lead with no auth required', async () => {
      const res = await request(ctx.app.getHttpServer() as App)
        .post('/api/leads')
        .send({ name: 'Ada Lovelace', email: 'ada@example.com', message: 'Interested in a demo' })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        stage: 'new',
        source: 'form',
      });
    });

    it('rejects an invalid payload', async () => {
      await request(ctx.app.getHttpServer() as App)
        .post('/api/leads')
        .send({ name: '', email: 'not-an-email', message: '' })
        .expect(400);
    });

    it('rate-limits after 5 requests in a window', async () => {
      const server = ctx.app.getHttpServer() as App;
      const payload = { name: 'Test', email: 'test@example.com', message: 'hi' };

      for (let i = 0; i < 5; i++) {
        await request(server).post('/api/leads').send(payload).expect(201);
      }

      const res = await request(server).post('/api/leads').send(payload).expect(429);
      expect(res.headers['retry-after']).toBeDefined();
    });

    it('requires a session to list leads', async () => {
      await request(ctx.app.getHttpServer() as App)
        .get('/api/leads')
        .expect(401);
    });

    it('requires a session to change a lead stage', async () => {
      await request(ctx.app.getHttpServer() as App)
        .patch(`/api/leads/${randomUUID()}/stage`)
        .send({ stage: 'contacted' })
        .expect(401);
    });

    it('requires a session to export CSV', async () => {
      await request(ctx.app.getHttpServer() as App)
        .get('/api/leads/export.csv')
        .expect(401);
    });
  });

  describe('authenticated dashboard flows', () => {
    let ctx: TestAppContext;

    beforeAll(async () => {
      ctx = await createTestApp({ authenticated: true });
    });
    beforeEach(async () => {
      await resetState(ctx);
    });
    afterAll(async () => {
      await closeTestApp(ctx);
    });

    async function createLead(overrides: Partial<Record<'name' | 'email' | 'message', string>> = {}) {
      const res = await request(ctx.app.getHttpServer() as App)
        .post('/api/leads')
        .send({
          name: 'Grace Hopper',
          email: 'grace@example.com',
          message: 'A compiler question',
          ...overrides,
        })
        .expect(201);
      return res.body as { id: string; email: string };
    }

    it('lists leads, newest first', async () => {
      await createLead({ email: 'first@example.com' });
      await createLead({ email: 'second@example.com' });

      const res = await request(ctx.app.getHttpServer() as App).get('/api/leads').expect(200);

      expect(res.body.total).toBe(2);
      expect(res.body.data[0].email).toBe('second@example.com');
    });

    it('searches across name, email, and message', async () => {
      await createLead({ name: 'Ada Lovelace', email: 'ada@example.com' });
      await createLead({ name: 'Grace Hopper', email: 'grace@example.com' });

      const res = await request(ctx.app.getHttpServer() as App)
        .get('/api/leads')
        .query({ q: 'ada' })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Ada Lovelace');
    });

    it('moves a lead through its pipeline stages', async () => {
      const lead = await createLead();

      const res = await request(ctx.app.getHttpServer() as App)
        .patch(`/api/leads/${lead.id}/stage`)
        .send({ stage: 'contacted' })
        .expect(200);

      expect(res.body.stage).toBe('contacted');
    });

    it('rejects a stage outside the enum', async () => {
      const lead = await createLead();

      await request(ctx.app.getHttpServer() as App)
        .patch(`/api/leads/${lead.id}/stage`)
        .send({ stage: 'won' })
        .expect(400);
    });

    it('404s when moving a lead that does not exist', async () => {
      await request(ctx.app.getHttpServer() as App)
        .patch(`/api/leads/${randomUUID()}/stage`)
        .send({ stage: 'contacted' })
        .expect(404);
    });

    it('streams a CSV export with a header row and one row per lead', async () => {
      await createLead({ name: 'Ada Lovelace', email: 'ada@example.com', message: 'hi' });

      const res = await request(ctx.app.getHttpServer() as App)
        .get('/api/leads/export.csv')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      const lines = res.text.trim().split('\n');
      expect(lines[0]).toBe('name,email,message,stage,source,created_at');
      expect(lines[1]).toContain('Ada Lovelace');
    });
  });
});

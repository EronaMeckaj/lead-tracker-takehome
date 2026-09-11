import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard.js';

function mockContext(overrides: { ip?: string; path?: string } = {}) {
  const request = {
    ip: overrides.ip ?? '1.2.3.4',
    method: 'POST',
    path: overrides.path ?? '/leads',
    route: { path: overrides.path ?? '/leads' },
  };
  const response = { setHeader: vi.fn() };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;

  return { context, response };
}

describe('RateLimitGuard', () => {
  let redis: {
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
  };
  let reflector: Reflector;
  let guard: RateLimitGuard;

  beforeEach(() => {
    redis = { incr: vi.fn(), expire: vi.fn(), ttl: vi.fn() };
    reflector = {
      get: vi.fn().mockReturnValue({ limit: 2, windowSeconds: 60 }),
    } as unknown as Reflector;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guard = new RateLimitGuard(redis as any, reflector);
  });

  it('allows the first request in a window and starts the expiry', async () => {
    redis.incr.mockResolvedValue(1);

    const { context } = mockContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.expire).toHaveBeenCalledWith(expect.any(String), 60);
  });

  it('does not reset the expiry on subsequent hits within the window', async () => {
    redis.incr.mockResolvedValue(2);

    const { context } = mockContext();
    await guard.canActivate(context);

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('rejects once the limit is exceeded and sets Retry-After from the key TTL', async () => {
    redis.incr.mockResolvedValue(3);
    redis.ttl.mockResolvedValue(42);

    const { context, response } = mockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '42');
  });

  it('keys the counter by IP so different callers get separate buckets', async () => {
    redis.incr.mockResolvedValue(1);

    const { context } = mockContext({ ip: '9.9.9.9' });
    await guard.canActivate(context);

    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining('9.9.9.9'));
  });
});

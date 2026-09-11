import { ConfigService } from '@nestjs/config';
import type { Profile, VerifyCallback } from 'passport-google-oauth20';
import { GoogleStrategy } from './google.strategy.js';
import { UsersService } from '../users/users.service.js';

function buildProfile(email: string): Profile {
  return {
    id: 'google-id-1',
    displayName: 'Ada Lovelace',
    emails: [{ value: email }],
    photos: [{ value: 'https://example.com/avatar.png' }],
  } as unknown as Profile;
}

describe('GoogleStrategy', () => {
  let configValues: Record<string, string | undefined>;
  let configService: ConfigService;
  let usersService: { findOrCreateFromGoogle: ReturnType<typeof vi.fn> };
  let strategy: GoogleStrategy;

  beforeEach(() => {
    configValues = {
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
    };
    configService = {
      getOrThrow: vi.fn((key: string) => {
        const value = configValues[key];
        if (value === undefined) {
          throw new Error(`Missing config: ${key}`);
        }
        return value;
      }),
      get: vi.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;
    usersService = {
      findOrCreateFromGoogle: vi.fn(async (profile) => ({ id: 'user-1', ...profile })),
    };

    strategy = new GoogleStrategy(configService, usersService as unknown as UsersService);
  });

  it('allows any account when ALLOWED_EMAILS is unset', async () => {
    const done = vi.fn() as VerifyCallback;

    await strategy.validate('token', 'refresh', buildProfile('anyone@example.com'), done);

    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ id: 'user-1' }));
  });

  it('rejects an email not on the allowlist', async () => {
    configValues['ALLOWED_EMAILS'] = 'ada@example.com, grace@example.com';
    const done = vi.fn() as VerifyCallback;

    await strategy.validate('token', 'refresh', buildProfile('someone-else@example.com'), done);

    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect(usersService.findOrCreateFromGoogle).not.toHaveBeenCalled();
  });

  it('allows an email on the allowlist, case-insensitively', async () => {
    configValues['ALLOWED_EMAILS'] = 'ada@example.com';
    const done = vi.fn() as VerifyCallback;

    await strategy.validate('token', 'refresh', buildProfile('Ada@Example.com'), done);

    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ id: 'user-1' }));
  });
});

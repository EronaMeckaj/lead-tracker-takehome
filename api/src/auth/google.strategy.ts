import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google profile did not include an email address'));
      return;
    }

    if (!this.isAllowed(email)) {
      done(new Error('This Google account is not allowed to access the dashboard'));
      return;
    }

    const user: User = await this.usersService.findOrCreateFromGoogle({
      googleId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    });
    done(null, user);
  }

  /**
   * ALLOWED_EMAILS unset means "allow any Google account" — convenient
   * for local dev, but it must be set before a real deploy, since
   * otherwise anyone with a Google account can sign in to the dashboard.
   */
  private isAllowed(email: string): boolean {
    const allowList = this.configService.get<string>('ALLOWED_EMAILS');
    if (!allowList) {
      return true;
    }
    const emails = allowList.split(',').map((entry) => entry.trim().toLowerCase());
    return emails.includes(email.toLowerCase());
  }
}

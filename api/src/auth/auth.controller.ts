import { Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { User } from '../users/entities/user.entity.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    // Passport redirects to Google's consent screen; this body never runs.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Res() res: Response): void {
    res.redirect(`${this.configService.getOrThrow<string>('FRONTEND_URL')}/dashboard`);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() req: Request): User {
    return req.user as User;
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response): void {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ message: 'Failed to log out' });
        return;
      }
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true });
      });
    });
  }
}

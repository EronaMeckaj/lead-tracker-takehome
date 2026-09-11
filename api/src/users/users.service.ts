import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findOrCreateFromGoogle(profile: GoogleProfile): Promise<User> {
    const existing = await this.usersRepository.findOneBy({ googleId: profile.googleId });
    if (existing) {
      existing.email = profile.email;
      existing.name = profile.name;
      existing.avatarUrl = profile.avatarUrl;
      return this.usersRepository.save(existing);
    }

    const user = this.usersRepository.create(profile);
    return this.usersRepository.save(user);
  }
}

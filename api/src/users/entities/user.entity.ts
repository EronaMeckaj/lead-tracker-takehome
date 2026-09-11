import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'google_id', unique: true })
  googleId!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

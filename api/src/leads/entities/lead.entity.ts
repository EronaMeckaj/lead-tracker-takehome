import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  CLOSED = 'closed',
}

export enum LeadSource {
  FORM = 'form',
  WEBHOOK = 'webhook',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column('text')
  message!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: LeadStage,
    enumName: 'lead_stage',
    default: LeadStage.NEW,
  })
  stage!: LeadStage;

  @Column({
    type: 'enum',
    enum: LeadSource,
    enumName: 'lead_source',
    default: LeadSource.FORM,
  })
  source!: LeadSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

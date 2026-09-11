import { IsEnum } from 'class-validator';
import { LeadStage } from '../entities/lead.entity.js';

export class UpdateLeadStageDto {
  @IsEnum(LeadStage)
  stage!: LeadStage;
}

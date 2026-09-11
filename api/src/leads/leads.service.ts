import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { QueryLeadsDto } from './dto/query-leads.dto.js';
import { Lead, LeadSource } from './entities/lead.entity.js';

export interface PaginatedLeads {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class LeadsService {
  constructor(@InjectRepository(Lead) private readonly leadsRepository: Repository<Lead>) {}

  create(dto: CreateLeadDto, source: LeadSource): Promise<Lead> {
    const lead = this.leadsRepository.create({ ...dto, source });
    return this.leadsRepository.save(lead);
  }

  async findAll(query: QueryLeadsDto): Promise<PaginatedLeads> {
    const { q, stage, page, limit } = query;
    const qb = this.leadsRepository.createQueryBuilder('lead');

    if (stage) {
      qb.andWhere('lead.stage = :stage', { stage });
    }
    if (q) {
      qb.andWhere('(lead.name ILIKE :q OR lead.email ILIKE :q OR lead.message ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    qb.orderBy('lead.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}

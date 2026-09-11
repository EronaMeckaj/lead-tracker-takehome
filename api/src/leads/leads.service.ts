import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { QueryLeadsDto } from './dto/query-leads.dto.js';
import { Lead, LeadSource, LeadStage } from './entities/lead.entity.js';

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

  async updateStage(id: string, stage: LeadStage): Promise<Lead> {
    const lead = await this.leadsRepository.findOneBy({ id });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    lead.stage = stage;
    return this.leadsRepository.save(lead);
  }

  /**
   * Raw-row stream (not entity-mapped) for CSV export, ordered oldest
   * first so a re-export appends predictably. Selecting explicit column
   * aliases keeps the row shape stable regardless of TypeORM's default
   * aliasing, since the export writes these keys directly as CSV columns.
   */
  streamAll() {
    return this.leadsRepository
      .createQueryBuilder('lead')
      .select('lead.name', 'name')
      .addSelect('lead.email', 'email')
      .addSelect('lead.message', 'message')
      .addSelect('lead.stage', 'stage')
      .addSelect('lead.source', 'source')
      .addSelect('lead.createdAt', 'created_at')
      .orderBy('lead.createdAt', 'ASC')
      .stream();
  }
}

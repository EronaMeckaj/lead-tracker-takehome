import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Lead, LeadSource, LeadStage } from './entities/lead.entity.js';
import { LeadsService } from './leads.service.js';

describe('LeadsService', () => {
  let service: LeadsService;
  let repo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      create: vi.fn((dto) => dto),
      save: vi.fn(async (entity) => ({ id: 'lead-1', ...entity })),
      findOneBy: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [LeadsService, { provide: getRepositoryToken(Lead), useValue: repo }],
    }).compile();

    service = module.get(LeadsService);
  });

  describe('create', () => {
    it('tags the lead with the given source', async () => {
      const lead = await service.create(
        { name: 'Ada', email: 'ada@example.com', message: 'Hi' },
        LeadSource.WEBHOOK,
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: LeadSource.WEBHOOK }),
      );
      expect(lead.id).toBe('lead-1');
    });
  });

  describe('findAll', () => {
    function mockQueryBuilder(rows: Lead[], total: number) {
      const qb = {
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([rows, total]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('filters by stage when provided', async () => {
      const qb = mockQueryBuilder([], 0);

      await service.findAll({ stage: LeadStage.CONTACTED, page: 1, limit: 20 });

      expect(qb.andWhere).toHaveBeenCalledWith('lead.stage = :stage', {
        stage: LeadStage.CONTACTED,
      });
    });

    it('searches name/email/message when q is provided', async () => {
      const qb = mockQueryBuilder([], 0);

      await service.findAll({ q: 'ada', page: 1, limit: 20 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(lead.name ILIKE :q OR lead.email ILIKE :q OR lead.message ILIKE :q)',
        { q: '%ada%' },
      );
    });

    it('paginates using skip/take derived from page and limit', async () => {
      const qb = mockQueryBuilder([], 0);

      await service.findAll({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('updateStage', () => {
    it('moves a lead to a new stage', async () => {
      repo.findOneBy.mockResolvedValue({ id: 'lead-1', stage: LeadStage.NEW } as Lead);

      const updated = await service.updateStage('lead-1', LeadStage.CONTACTED);

      expect(updated.stage).toBe(LeadStage.CONTACTED);
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown lead', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.updateStage('missing', LeadStage.CONTACTED)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

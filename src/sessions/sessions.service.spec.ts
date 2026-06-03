import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../database/prisma.service';

describe('SessionsService', () => {
  let service: SessionsService;
  let prismaMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    prismaMock = {
      contributionRequest: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      qrSession: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  describe('validate', () => {
    const requestId = 1;

    it('should throw NotFoundException if request not found', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue(null);

      await expect(service.validate(requestId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return invalid if status is not WAITING', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PAID',
        expiresAt: new Date(Date.now() + 60000),
        qrSession: { expiresAt: new Date(Date.now() + 60000) },
      });

      const result = await service.validate(requestId);

      expect(result.valid).toBe(false);
    });

    it('should return invalid if request is expired', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'WAITING',
        expiresAt: new Date(Date.now() - 60000),
        qrSession: { expiresAt: new Date(Date.now() + 60000) },
      });

      const result = await service.validate(requestId);

      expect(result.valid).toBe(false);
      expect((result as { valid: boolean; reason: string }).reason).toContain(
        'expired',
      );
    });

    it('should return valid for a valid waiting request', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue({
        id: requestId,
        referenceCode: 'test-ref-code',
        amount: 100,
        status: 'WAITING',
        expiresAt: new Date(Date.now() + 300000),
        qrSession: { expiresAt: new Date(Date.now() + 300000) },
      });

      const result = await service.validate(requestId);

      expect(result.valid).toBe(true);
    });
  });

  describe('expire', () => {
    const requestId = 1;

    it('should throw NotFoundException if request not found', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue(null);

      await expect(service.expire(requestId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if request is not WAITING', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PAID',
      });

      await expect(service.expire(requestId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should expire a waiting request and close its session', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'WAITING',
      });
      prismaMock.contributionRequest.update.mockResolvedValue({
        id: requestId,
        status: 'EXPIRED',
      });
      prismaMock.qrSession.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.expire(requestId);

      expect(result.status).toBe('EXPIRED');
      expect(prismaMock.contributionRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: requestId },
          data: { status: 'EXPIRED' },
        }),
      );
      expect(prismaMock.qrSession.deleteMany).toHaveBeenCalledWith({
        where: { requestId },
      });
    });
  });
});

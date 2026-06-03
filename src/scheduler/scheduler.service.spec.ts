import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from '../database/prisma.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let prismaMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    prismaMock = {
      contributionRequest: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      qrSession: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  describe('handleExpiration', () => {
    it('should do nothing if no expired requests found', async () => {
      prismaMock.contributionRequest.findMany.mockResolvedValue([]);

      await service.handleExpiration();

      expect(prismaMock.contributionRequest.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.qrSession.deleteMany).not.toHaveBeenCalled();
    });

    it('should batch update expired requests and delete qr sessions', async () => {
      const expiredRequests = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ];

      prismaMock.contributionRequest.findMany.mockResolvedValue(
        expiredRequests,
      );
      prismaMock.contributionRequest.updateMany.mockResolvedValue({ count: 3 });
      prismaMock.qrSession.deleteMany.mockResolvedValue({ count: 3 });

      await service.handleExpiration();

      expect(prismaMock.contributionRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2, 3] },
          status: 'WAITING',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      expect(prismaMock.qrSession.deleteMany).toHaveBeenCalledWith({
        where: {
          requestId: { in: [1, 2, 3] },
        },
      });
    });

    it('should handle single expired request', async () => {
      prismaMock.contributionRequest.findMany.mockResolvedValue([{ id: 10 }]);
      prismaMock.contributionRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.qrSession.deleteMany.mockResolvedValue({ count: 1 });

      await service.handleExpiration();

      expect(prismaMock.contributionRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [10] },
          status: 'WAITING',
        },
        data: { status: 'EXPIRED' },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { PrismaService } from '../database/prisma.service';

describe('ContributionsService', () => {
  let service: ContributionsService;
  let prismaMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    prismaMock = {
      contributionRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      paymentMethod: {
        findUnique: jest.fn(),
      },
      qrSession: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ContributionsService>(ContributionsService);
  });

  describe('create', () => {
    const memberId = 1;
    const dto = { amount: 100, paymentMethodId: 1 };

    it('should throw NotFoundException if payment method not found', async () => {
      prismaMock.paymentMethod.findUnique.mockResolvedValue(null);

      await expect(service.create(memberId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if payment method is not active', async () => {
      prismaMock.paymentMethod.findUnique.mockResolvedValue({
        id: 1,
        isActive: false,
      });

      await expect(service.create(memberId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a contribution request with qr session', async () => {
      prismaMock.paymentMethod.findUnique.mockResolvedValue({
        id: 1,
        methodType: 'PROMPTPAY',
        accountNo: '1234567890',
        isActive: true,
      });

      const mockRequest = {
        id: 1,
        memberId,
        paymentMethodId: dto.paymentMethodId,
        amount: dto.amount,
        referenceCode: expect.any(String),
        status: 'WAITING',
        expiresAt: expect.any(Date),
        qrSession: { id: 1, requestId: 1 },
        paymentMethod: { id: 1, methodType: 'PROMPTPAY' },
      };

      prismaMock.contributionRequest.create.mockResolvedValue(mockRequest);

      const result = await service.create(memberId, dto);

      expect(result).toEqual(mockRequest);
      expect(prismaMock.contributionRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId,
            paymentMethodId: dto.paymentMethodId,
            amount: dto.amount,
            status: 'WAITING',
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    const requestId = 1;
    const memberId = 1;

    it('should throw NotFoundException if request not found', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue(null);

      await expect(service.cancel(requestId, memberId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if request belongs to another member', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue({
        id: requestId,
        memberId: 999,
        status: 'WAITING',
      });

      await expect(service.cancel(requestId, memberId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if request is not WAITING', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue({
        id: requestId,
        memberId,
        status: 'PAID',
      });

      await expect(service.cancel(requestId, memberId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cancel a waiting request', async () => {
      prismaMock.contributionRequest.findUnique.mockResolvedValue({
        id: requestId,
        memberId,
        status: 'WAITING',
        qrSessionId: 1,
      });
      prismaMock.contributionRequest.update.mockResolvedValue({
        id: requestId,
        status: 'CANCELLED',
      });
      prismaMock.qrSession.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.cancel(requestId, memberId);

      expect(result.status).toBe('CANCELLED');
      expect(prismaMock.contributionRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: requestId },
          data: { status: 'CANCELLED' },
        }),
      );
    });
  });

  describe('findAll', () => {
    const memberId = 1;

    it('should return paginated results', async () => {
      const mockRequests = [
        { id: 1, memberId, amount: 100, status: 'WAITING' },
        { id: 2, memberId, amount: 200, status: 'PAID' },
      ];

      prismaMock.contributionRequest.findMany.mockResolvedValue(mockRequests);
      prismaMock.contributionRequest.count.mockResolvedValue(2);

      const result = await service.findAll(memberId, { page: 1, limit: 10 });

      expect(result.data).toEqual(mockRequests);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});

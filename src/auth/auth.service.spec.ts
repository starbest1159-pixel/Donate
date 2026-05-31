import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: Record<string, jest.Mock>;
  let jwtServiceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    prismaMock = {
      member: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtServiceMock = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test@1234',
    };

    it('should throw ConflictException if email already exists', async () => {
      prismaMock.member.findFirst.mockResolvedValue({
        id: 1,
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if username already taken', async () => {
      prismaMock.member.findFirst.mockResolvedValue({
        id: 1,
        username: registerDto.username,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create a member with hashed password', async () => {
      prismaMock.member.findFirst.mockResolvedValue(null);
      prismaMock.member.create.mockResolvedValue({
        id: 1,
        username: registerDto.username,
        email: registerDto.email,
        role: 'MEMBER',
      });

      const result = await service.register(registerDto);

      expect(result).toEqual({
        id: 1,
        username: registerDto.username,
        email: registerDto.email,
        role: 'MEMBER',
      });

      expect(prismaMock.member.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Test@1234',
    };

    it('should throw UnauthorizedException for invalid credentials', async () => {
      prismaMock.member.findUnique.mockResolvedValue({
        id: 1,
        email: loginDto.email,
        passwordHash: await bcrypt.hash('Different@1234', 12),
        status: 'ACTIVE',
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return tokens on successful login', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);
      prismaMock.member.findUnique.mockResolvedValue({
        id: 1,
        email: loginDto.email,
        passwordHash: hashedPassword,
        role: 'MEMBER',
        status: 'ACTIVE',
      });
      jwtServiceMock.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      jwtServiceMock.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.generateTokens(1, 'test@example.com', 'MEMBER');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(2);
    });
  });
});

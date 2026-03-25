import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppController } from './app.controller';
import { DATABASE_TOKEN } from './common/database/database.module';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: DATABASE_TOKEN,
          useValue: {
            db: {},
            pool: { query: vi.fn().mockResolvedValue({}) },
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('health check should return ok when DB is connected', async () => {
    const result = await controller.getHealth();
    expect(result.status).toBe('ok');
    expect(result.db).toBe('connected');
  });

  it('health check should return degraded when DB fails', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: DATABASE_TOKEN,
          useValue: {
            db: {},
            pool: {
              query: vi.fn().mockRejectedValue(new Error('Connection failed')),
            },
          },
        },
      ],
    }).compile();

    const failController = module.get<AppController>(AppController);
    const result = await failController.getHealth();
    expect(result.status).toBe('degraded');
    expect(result.db).toBe('disconnected');
  });
});

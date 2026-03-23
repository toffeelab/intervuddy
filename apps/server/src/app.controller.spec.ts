import { Test, TestingModule } from '@nestjs/testing';
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

  it('health check should return ok', async () => {
    const result = await controller.getHealth();
    expect(result.status).toBe('ok');
  });
});

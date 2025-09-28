import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.checkHealth();
    
    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('uptime');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('environment');
    expect(result).toHaveProperty('memory');
    expect(result.memory).toHaveProperty('used');
    expect(result.memory).toHaveProperty('total');
    expect(typeof result.uptime).toBe('number');
    expect(typeof result.memory.used).toBe('number');
    expect(typeof result.memory.total).toBe('number');
  });
});
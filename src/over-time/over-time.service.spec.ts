import { Test, TestingModule } from '@nestjs/testing';
import { OverTimeService } from './over-time.service';

describe('OverTimeService', () => {
  let service: OverTimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OverTimeService],
    }).compile();

    service = module.get<OverTimeService>(OverTimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

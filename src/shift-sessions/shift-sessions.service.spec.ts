import { Test, TestingModule } from '@nestjs/testing';
import { ShiftSessionService } from './shift-sessions.service';

describe('ShiftSessionsService', () => {
  let service: ShiftSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftSessionService],
    }).compile();

    service = module.get<ShiftSessionService>(ShiftSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

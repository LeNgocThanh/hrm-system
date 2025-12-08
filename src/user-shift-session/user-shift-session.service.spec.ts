import { Test, TestingModule } from '@nestjs/testing';
import { UserShiftSessionService } from './user-shift-session.service';

describe('UserShiftSessionService', () => {
  let service: UserShiftSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserShiftSessionService],
    }).compile();

    service = module.get<UserShiftSessionService>(UserShiftSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

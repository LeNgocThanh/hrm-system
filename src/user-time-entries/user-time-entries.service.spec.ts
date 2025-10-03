import { Test, TestingModule } from '@nestjs/testing';
import { UserTimeEntriesService } from './user-time-entries.service';

describe('UserTimeEntriesService', () => {
  let service: UserTimeEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserTimeEntriesService],
    }).compile();

    service = module.get<UserTimeEntriesService>(UserTimeEntriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

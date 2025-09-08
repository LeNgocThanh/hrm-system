import { Test, TestingModule } from '@nestjs/testing';
import { UserAssignmentsService } from './user-assignments.service';

describe('UserAssignmentsService', () => {
  let service: UserAssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserAssignmentsService],
    }).compile();

    service = module.get<UserAssignmentsService>(UserAssignmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

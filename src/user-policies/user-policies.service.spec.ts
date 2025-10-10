import { Test, TestingModule } from '@nestjs/testing';
import { UserPoliciesService } from './user-policies.service';

describe('UserPoliciesService', () => {
  let service: UserPoliciesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPoliciesService],
    }).compile();

    service = module.get<UserPoliciesService>(UserPoliciesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

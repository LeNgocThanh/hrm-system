import { Test, TestingModule } from '@nestjs/testing';
import { UserPolicyBindingController } from './user-policies.controller';

describe('UserPoliciesController', () => {
  let controller: UserPolicyBindingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPolicyBindingController],
    }).compile();

    controller = module.get<UserPolicyBindingController>(UserPolicyBindingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UserAssignmentsController } from './user-assignments.controller';

describe('UserAssignmentsController', () => {
  let controller: UserAssignmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAssignmentsController],
    }).compile();

    controller = module.get<UserAssignmentsController>(UserAssignmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

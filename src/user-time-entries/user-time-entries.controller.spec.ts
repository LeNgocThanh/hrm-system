import { Test, TestingModule } from '@nestjs/testing';
import { UserTimeEntriesController } from './user-time-entries.controller';

describe('UserTimeEntriesController', () => {
  let controller: UserTimeEntriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserTimeEntriesController],
    }).compile();

    controller = module.get<UserTimeEntriesController>(UserTimeEntriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

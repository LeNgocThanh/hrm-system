import { Test, TestingModule } from '@nestjs/testing';
import { UserShiftSessionController } from './user-shift-session.controller';

describe('UserShiftSessionController', () => {
  let controller: UserShiftSessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserShiftSessionController],
    }).compile();

    controller = module.get<UserShiftSessionController>(UserShiftSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

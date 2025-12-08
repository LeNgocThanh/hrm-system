import { Test, TestingModule } from '@nestjs/testing';
import { ShiftSessionController } from './shift-sessions.controller';

describe('ShiftSessionsController', () => {
  let controller: ShiftSessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftSessionController],
    }).compile();

    controller = module.get<ShiftSessionController>(ShiftSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

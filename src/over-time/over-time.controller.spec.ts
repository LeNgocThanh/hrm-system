import { Test, TestingModule } from '@nestjs/testing';
import { OverTimeController } from './over-time.controller';

describe('OverTimeController', () => {
  let controller: OverTimeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OverTimeController],
    }).compile();

    controller = module.get<OverTimeController>(OverTimeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

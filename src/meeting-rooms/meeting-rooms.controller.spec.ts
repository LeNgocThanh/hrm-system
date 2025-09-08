import { Test, TestingModule } from '@nestjs/testing';
import { MeetingRoomsController } from './meeting-rooms.controller';

describe('MeetingRoomsController', () => {
  let controller: MeetingRoomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingRoomsController],
    }).compile();

    controller = module.get<MeetingRoomsController>(MeetingRoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

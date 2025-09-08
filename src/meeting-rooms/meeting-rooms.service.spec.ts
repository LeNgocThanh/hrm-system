import { Test, TestingModule } from '@nestjs/testing';
import { MeetingRoomsService } from './meeting-rooms.service';

describe('MeetingRoomsService', () => {
  let service: MeetingRoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeetingRoomsService],
    }).compile();

    service = module.get<MeetingRoomsService>(MeetingRoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

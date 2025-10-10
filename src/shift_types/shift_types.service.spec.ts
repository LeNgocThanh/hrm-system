import { Test, TestingModule } from '@nestjs/testing';
import { ShiftTypesService } from './shift_types.service';

describe('ShiftTypesService', () => {
  let service: ShiftTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftTypesService],
    }).compile();

    service = module.get<ShiftTypesService>(ShiftTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

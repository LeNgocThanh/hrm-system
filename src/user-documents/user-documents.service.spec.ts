import { Test, TestingModule } from '@nestjs/testing';
import { UserDocumentsService } from './user-documents.service';

describe('UserDocumentsService', () => {
  let service: UserDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserDocumentsService],
    }).compile();

    service = module.get<UserDocumentsService>(UserDocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UserDocumentsController } from './user-documents.controller';

describe('UserDocumentsController', () => {
  let controller: UserDocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserDocumentsController],
    }).compile();

    controller = module.get<UserDocumentsController>(UserDocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

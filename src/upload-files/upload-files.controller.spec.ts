import { Test, TestingModule } from '@nestjs/testing';
import { UploadFilesController } from './upload-files.controller';

describe('UploadFilesController', () => {
  let controller: UploadFilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadFilesController],
    }).compile();

    controller = module.get<UploadFilesController>(UploadFilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

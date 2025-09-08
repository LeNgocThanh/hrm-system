import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset, AssetSchema } from './schemas/asset.schema';
import { AssetEvent, AssetEventSchema } from './schemas/asset-event.schema';
import { AssetDocument as AssetDoc, AssetDocumentSchema } from './schemas/asset-document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: AssetEvent.name, schema: AssetEventSchema },
      { name: AssetDoc.name, schema: AssetDocumentSchema },
    ]),
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
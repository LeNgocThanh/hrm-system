import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Notice, NoticeSchema } from './schemas/notice.schema'
import { NoticesService } from './notices.service'
import { NoticesController } from './notices.controller'

@Module({
  imports: [MongooseModule.forFeature([{ name: Notice.name, schema: NoticeSchema }])],
  controllers: [NoticesController],
  providers: [NoticesService],
  exports: [NoticesService],
})
export class NoticesModule {}

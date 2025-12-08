// src/attendance/shift-session.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ShiftSessionNew,
  ShiftSessionSchema,
} from './schemas/shift-session.schema';
import { ShiftSessionService } from './shift-sessions.service';
import { ShiftSessionController } from './shift-sessions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShiftSessionNew.name, schema: ShiftSessionSchema },
    ]),
  ],
  controllers: [ShiftSessionController],
  providers: [ShiftSessionService],
  exports: [ShiftSessionService],
})
export class ShiftSessionsModule {}

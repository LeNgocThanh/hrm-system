// src/shift-types/shift-types.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiftType, ShiftTypeSchema } from './schemas/shift-type.schema';
import { ShiftTypesService } from './shift_types.service';
import { ShiftTypesController } from './shift_types.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShiftType.name, schema: ShiftTypeSchema },
    ]),
  ],
  providers: [ShiftTypesService],
  controllers: [ShiftTypesController],
  exports: [ShiftTypesService],
})
export class ShiftTypesModule {}

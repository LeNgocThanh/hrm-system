import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Position, PositionDocument } from './schemas/position.schema';
import { CreatePositionDto, UpdatePositionDto, PositionResponseDto } from './dto';

@Injectable()
export class PositionsService {
  constructor(@InjectModel(Position.name) private positionModel: Model<PositionDocument>) {}

  async create(createPositionDto: CreatePositionDto): Promise<PositionResponseDto> {
    const createdPosition = await this.positionModel.create(createPositionDto);
    return createdPosition.toObject() as unknown as PositionResponseDto;
  }

  async findAll(isActive?: boolean): Promise<PositionResponseDto[]> {
    const filter = isActive !== undefined ? { isActive } : {};
    const positions = await this.positionModel.find(filter).sort({ level: 1, name: 1 }).exec();
    return positions.map(position => position.toObject() as unknown as PositionResponseDto);
  }

  async findActivePositions(): Promise<PositionResponseDto[]> {
    const activePositions = await this.positionModel.find({ isActive: true }).sort({ level: 1, name: 1 }).exec();
    return activePositions.map(position => position.toObject() as unknown as PositionResponseDto);
  }

  async findByLevel(level: number): Promise<PositionResponseDto[]> {
    const positions = await this.positionModel.find({ level, isActive: true }).sort({ name: 1 }).exec();
    return positions.map(position => position.toObject() as unknown as PositionResponseDto);
  }

  async findOne(id: string): Promise<PositionResponseDto> {
    const position = await this.positionModel.findById(id).exec();
    return position?.toObject() as unknown as PositionResponseDto;
  }

  async update(id: string, updatePositionDto: UpdatePositionDto): Promise<PositionResponseDto> {
    const updatedPosition = await this.positionModel.findByIdAndUpdate(id, updatePositionDto, { new: true }).exec();
    return updatedPosition?.toObject() as unknown as PositionResponseDto;
  }

  async delete(id: string): Promise<PositionResponseDto> {
    const deletedPosition = await this.positionModel.findByIdAndDelete(id).exec();
    return deletedPosition?.toObject() as unknown as PositionResponseDto;
  }
}

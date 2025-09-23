// src/leave/dto/review-leave.dto.ts
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';

export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  CANCEL = 'cancel',
}

export class ReviewLeaveDto {
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @IsOptional()
  @IsString()
  note?: string;

  @IsMongoId()
  reviewerId: string; // ai thực hiện hành động
}

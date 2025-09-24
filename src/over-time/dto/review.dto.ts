import { IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';

export class ReviewOvertimeDto {
  @IsIn(['approve','reject','cancel'])
  action!: 'approve'|'reject'|'cancel';

  @IsMongoId()
  reviewerId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

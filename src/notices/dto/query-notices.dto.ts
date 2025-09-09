import { IsArray, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator'
import { NoticeStatus, NoticeVisibility } from '../schemas/notice.schema'

export class QueryNoticesDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus

  @IsOptional()
  @IsEnum(NoticeVisibility)
  visibility?: NoticeVisibility

  @IsOptional()
  @IsArray()
  tags?: string[]

  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  limit?: string
}

import { IsArray, IsDateString, IsEnum, IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { NoticeStatus, NoticeVisibility } from '../schemas/notice.schema'

export class CreateNoticeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string

  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  attachments?: string[]

  @IsOptional()
  @IsMongoId()
  coverImage?: string

  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus

  @IsOptional()
  @IsEnum(NoticeVisibility)
  visibility?: NoticeVisibility

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedPermissions?: string[]

  @IsOptional()
  @IsDateString()
  publishAt?: string

  @IsOptional()
  @IsDateString()
  expireAt?: string

  @IsOptional()
  pinned?: boolean
}

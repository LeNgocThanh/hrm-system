import { Type, Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString, Max, Min, ValidateIf } from 'class-validator'
import { NoticeStatus, NoticeVisibility } from '../schemas/notice.schema'

const toArray = (v: any) => Array.isArray(v) ? v : (v != null ? String(v).split(',').map(s => s.trim()).filter(Boolean) : undefined)

export class AdminQueryNoticesDto {
  @IsOptional() @IsString() q?: string // full-text search

  @IsOptional() @IsString() category?: string

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsIn(['public', 'internal', 'role_based'], { each: true })
  visibility?: NoticeVisibility[]

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsIn(['draft', 'published', 'archived'], { each: true })
  status?: NoticeStatus[]

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  tags?: string[]

  // lọc theo mốc thời gian
  @IsOptional() @Type(() => Date) from?: Date
  @IsOptional() @Type(() => Date) to?: Date

  // cờ lọc nhanh
  @IsOptional() @Type(() => Boolean) onlyExpired?: boolean   // expireAt <= now
  @IsOptional() @Type(() => Boolean) onlyScheduled?: boolean // publishAt > now
  @IsOptional() @Type(() => Boolean) onlyDraft?: boolean     // status = 'draft'

  // trường thời gian áp from/to
  @IsOptional() @IsIn(['createdAt', 'publishAt', 'updatedAt'])
  timeField?: 'createdAt' | 'publishAt' | 'updatedAt'

  // phân trang
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() @Max(100) limit = 20

  // sắp xếp
  @IsOptional() @IsString() sortBy?: string // ví dụ: 'publishAt' | 'createdAt' | 'updatedAt'
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc'

  // bật/tắt populate quan hệ
  @IsOptional() @Type(() => Boolean) includeRelations = true
}

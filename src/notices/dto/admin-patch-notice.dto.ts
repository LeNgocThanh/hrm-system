import { Type, Transform } from 'class-transformer'
import { IsArray, IsDate, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { NoticeStatus, NoticeVisibility } from '../schemas/notice.schema'

// Tiện ích: chấp nhận tags=tag1,tag2 hoặc lặp ?tags=tag1&tags=tag2
const toArray = (v: any) =>
  Array.isArray(v) ? v : (v != null ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : undefined)

export class AdminPatchNoticeDto {
  // Hai trường chính mà anh/chị muốn chỉnh bằng PATCH
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: NoticeStatus

  @IsOptional()
  @IsIn(['public', 'internal', 'role_based'])
  visibility?: NoticeVisibility

  // Các trường thường cần chỉnh kèm theo vòng đời thông báo
  @IsOptional() @Type(() => Date) @IsDate()
  publishAt?: Date

  @IsOptional() @Type(() => Date) @IsDate()
  expireAt?: Date

  // Một số meta cơ bản (tuỳ dùng)
  @IsOptional() @IsString() @MaxLength(200)
  category?: string

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  tags?: string[]

  // Nếu schema có cho phép trường này (role_based)
  // Bỏ comment nếu trong schema thực sự tồn tại:
  // @IsOptional()
  // @Transform(({ value }) => toArray(value))
  // @IsArray()
  // allowedPermissions?: string[]

  // Cân nhắc cho phép chỉnh `title`, `content` bằng PATCH
  // để thuận tiện sửa nhỏ:
  @IsOptional() @IsString()
  title?: string

  @IsOptional() @IsString()
  content?: string
}

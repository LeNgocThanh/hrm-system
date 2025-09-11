import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
const slugify = require('slugify') as (s: string, opts?: any) => string
export type NoticeDocument = Notice & Document

export enum NoticeStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

export enum NoticeVisibility {
  Public = 'public',
  Internal = 'internal',
  RoleBased = 'role_based',
}

@Schema({ timestamps: true })
export class Notice {
  @Prop({ required: true, trim: true })
  title: string

  @Prop({ trim: true, index: true, unique: true })
  slug: string

  @Prop({ default: '' })
  summary: string

  @Prop({ type: String, default: '' })
  content: string

  @Prop({ type: [String], default: [] })
  tags: string[]

  @Prop({ type: String, default: 'general', index: true })
  category: string

  @Prop({ type: [Types.ObjectId], ref: 'UploadFile', default: [] })
  attachments: Types.ObjectId[]

  @Prop({ type: Types.ObjectId, ref: 'UploadFile' })
  coverImage?: Types.ObjectId

  @Prop({ type: String, enum: NoticeStatus, default: NoticeStatus.Draft, index: true })
  status: NoticeStatus

  @Prop({ type: String, enum: NoticeVisibility, default: NoticeVisibility.Internal, index: true })
  visibility: NoticeVisibility

  @Prop({ type: [String], default: [] })
  allowedPermissions: string[]

  @Prop({ type: Date })
  publishAt?: Date

  @Prop({ type: Date })
  expireAt?: Date

  @Prop({ type: Boolean, default: false, index: true })
  pinned: boolean

  @Prop({ type: Number, default: 0 })
  viewCount: number

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  createdBy: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId

  @Prop({
    type: [
      {
        content: String,
        summary: String,
        updatedAt: Date,
        updatedBy: { type: Types.ObjectId, ref: 'User' },
      },
    ],
    default: [],
  })
  versions: Array<{ content: string; summary?: string; updatedAt: Date; updatedBy: Types.ObjectId }>
}

export const NoticeSchema = SchemaFactory.createForClass(Notice)

// Auto-generate slug
NoticeSchema.pre<NoticeDocument>('validate', function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true, locale: 'vi', trim: true })
  }
  next()
})

NoticeSchema.index({ title: 'text', content: 'text', tags: 'text' }, { weights: { title: 5, tags: 3, content: 1 } })
NoticeSchema.index({ status: 1, publishAt: 1 })
NoticeSchema.index({ category: 1, createdAt: -1 })
NoticeSchema.index({ publishAt: -1 });
NoticeSchema.index({ expireAt: -1 });
NoticeSchema.index({ visibility: 1 });

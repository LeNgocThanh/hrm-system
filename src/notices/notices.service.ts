import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FilterQuery, Model, Types } from 'mongoose'
import { Notice, NoticeDocument, NoticeStatus, NoticeVisibility } from './schemas/notice.schema'
import { CreateNoticeDto } from './dto/create-notice.dto'
import { UpdateNoticeDto } from './dto/update-notice.dto'
import { QueryNoticesDto } from './dto/query-notices.dto'
import slugify from 'slugify'
import { AdminQueryNoticesDto } from './dto/admin-query-noties.dto'
import { AdminPatchNoticeDto } from './dto/admin-patch-notice.dto'
import { BadRequestException } from '@nestjs/common'


@Injectable()
export class NoticesService {
  constructor(@InjectModel(Notice.name) private readonly noticeModel: Model<NoticeDocument>) {}

  /**
   * Tạo slug duy nhất từ title hoặc chuỗi mong muốn.
   * Nếu trùng, tự động thêm hậu tố -2, -3, ...
   */
  private async generateUniqueSlug(title: string, desired?: string): Promise<string> {
    const base = slugify((desired || title || '').trim(), {
      lower: true,
      strict: true,
      locale: 'vi',
      trim: true,
    }) || `${Date.now()}`

    let slug = base
    let i = 2
    while (await this.noticeModel.exists({ slug })) {
      slug = `${base}-${i++}`
    }
    return slug
  }

  async create(dto: CreateNoticeDto, userId: string) {
    const slug = await this.generateUniqueSlug(dto.title, dto.slug)

    const doc = await this.noticeModel.create({
      ...dto,
      slug,
      publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
      expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    })
    return doc
  }

  async findAll(query: QueryNoticesDto, currentUserPermissions: string[] = []) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);    

    const filter: FilterQuery<NoticeDocument> = {}

    if (query.category) filter.category = query.category
    if (query.status) filter.status = query.status
    if (query.visibility) filter.visibility = query.visibility
    if (query.tags?.length) filter.tags = { $in: query.tags }

    // Visibility filter + thời hạn publish/expire
    filter.$and = [
      {
        $or: [
          { visibility: NoticeVisibility.Public },
          { visibility: NoticeVisibility.Internal },
          {
            visibility: NoticeVisibility.RoleBased,
            allowedPermissions: { $in: currentUserPermissions || [] },
          },
        ],
      },
      {
        $or: [
          { status: NoticeStatus.Published, $expr: { $lte: ['$publishAt', new Date()] } },
          { status: { $ne: NoticeStatus.Published } },
        ],
      },
      {
        $or: [
          { expireAt: { $exists: false } },
          { expireAt: null },
          { expireAt: { $gt: new Date() } },
        ],
      },
    ]

    const sort = { pinned: -1, publishAt: -1, createdAt: -1 }

    const pipeline: any[] = [
      { $match: filter },
    ]

    if (query.q) {
      pipeline.push(
        { $match: { $text: { $search: query.q } } },
        { $addFields: { score: { $meta: 'textScore' } } },
        { $sort: { score: { $meta: 'textScore' }, ...sort } },
      )
    } else {
      pipeline.push({ $sort: sort })
    }

    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'uploadfiles',
          localField: 'attachments',
          foreignField: '_id',
          as: 'attachments',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdByUser',
        },
      },
      { $unwind: { path: '$createdByUser', preserveNullAndEmptyArrays: true } },
    )

    const [items, total] = await Promise.all([
      this.noticeModel.aggregate(pipeline),
      this.noticeModel.countDocuments(filter),
    ])

    return { items, page, limit, total }
  }

  async findOne(idOrSlug: string) {
    console.log('findOne', idOrSlug)
    const isObjectId = Types.ObjectId.isValid(idOrSlug);
    const filter: FilterQuery<NoticeDocument> = isObjectId ? { _id: new Types.ObjectId(idOrSlug) } : { slug: idOrSlug }
    console.log('filter', filter) 

    const doc = await this.noticeModel.findOne(filter).populate('attachments').populate('createdBy').lean()
    if (!doc) throw new NotFoundException('Notice not found')

    // Kiểm tra quyền xem khi role_based
    // if (doc.visibility === NoticeVisibility.RoleBased) {
    //   const ok = (doc.allowedPermissions || []).some((p: string) => currentUserPermissions.includes(p))
    //   if (!ok) throw new NotFoundException('Not permitted')
    // }

    // tăng view
    await this.noticeModel.updateOne({ _id: (doc as any)._id }, { $inc: { viewCount: 1 } }).exec()

    return doc
  }

  async update(id: string, dto: UpdateNoticeDto, userId: string) {
    const _id = new Types.ObjectId(id)
    const existed = await this.noticeModel.findById(_id)
    if (!existed) throw new NotFoundException('Notice not found')

    // lưu version cũ
    const version = {
      content: existed.content,
      summary: existed.summary,
      updatedAt: new Date(),
      updatedBy: new Types.ObjectId(userId),
    }

    // Nếu title/slug thay đổi → sinh slug mới
    let slug = existed.slug
    if (dto.slug || dto.title) {
      slug = await this.generateUniqueSlug(dto.title ?? existed.title, dto.slug)
    }

    const update: any = {
      ...dto,
      slug,
      publishAt: dto.publishAt ? new Date(dto.publishAt as any) : existed.publishAt,
      expireAt: dto.expireAt ? new Date(dto.expireAt as any) : existed.expireAt,
      updatedBy: new Types.ObjectId(userId),
      $push: { versions: version },
    }

    await this.noticeModel.updateOne({ _id }, update)
    return this.noticeModel.findById(_id).populate('attachments').populate('createdBy')
  }

  async remove(id: string) {
    return this.noticeModel.findByIdAndDelete(id)
  }

  async findAllAdmin(dto: AdminQueryNoticesDto) {
  const {
    q, category, visibility, status, tags,
    from, to, timeField = 'createdAt',
    onlyExpired, onlyScheduled, onlyDraft,
    page = 1, limit = 20,
    sortBy, order = 'desc',
    includeRelations = true,
  } = dto

  const now = new Date()
  const filter: FilterQuery<NoticeDocument> = {}

  if (category) filter.category = category
  if (visibility?.length) filter.visibility = { $in: visibility }
  if (status?.length) filter.status = { $in: status }
  if (tags?.length) filter.tags = { $in: tags }

  // cờ nhanh
  if (onlyDraft) {
    filter.status = 'draft'
  }
  if (onlyExpired) {
    // đã hết hạn: expireAt tồn tại và <= now
    filter.expireAt = { $lte: now }
  }
  if (onlyScheduled) {
    // chưa đến giờ publish
    filter.publishAt = { $gt: now }
  }

  // khoảng thời gian
  if (from || to) {
    (filter as any)[timeField] = {}
    if (from) (filter as any)[timeField]['$gte'] = from
    if (to) (filter as any)[timeField]['$lte'] = to
  }
  console.log('filter', filter)

  // xây query chính
  const query = this.noticeModel.find(filter)
  console.log('Base query', query.getQuery())

  // full-text search
  if (q?.trim()) {
    query.find({ $text: { $search: q.trim() } })
    // sort theo textScore trước nếu có q
    query.sort({ score: { $meta: 'textScore' } })
    // add select để có thể trả textScore nếu cần (không bắt buộc)
    query.select({ score: { $meta: 'textScore' } as any })
  }

  // populate quan hệ nếu được yêu cầu
  if (includeRelations) {
    query.populate('attachments').populate('createdBy')
  }

  // sắp xếp bổ sung
  if (sortBy) {
    query.sort({ [sortBy]: (order === 'asc') ? 1 : -1 })
  } else {
    // mặc định: ưu tiên ngày cập nhật/gần đây
    query.sort({ publishAt: -1, createdAt: -1, updatedAt: -1 })
  }

  // phân trang
  const skip = (page - 1) * limit
  query.skip(skip).limit(limit)

  const [items, total] = await Promise.all([
    query.lean().exec(),
    this.noticeModel.countDocuments(q?.trim() ? { ...filter, $text: { $search: q.trim() } } : filter),
  ])

  return { items, page, limit, total }
}

async patchAdmin(id: string, dto: AdminPatchNoticeDto, opts?: { updatedBy?: string }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid notice id')
    }

    const update: any = {}

    // Chỉ copy các trường thật sự có trên dto (không ghi đè bằng undefined)
    // Hai trường chính:
    if (dto.status !== undefined) update.status = dto.status
    if (dto.visibility !== undefined) update.visibility = dto.visibility

    // Thời gian/vòng đời
    if (dto.publishAt !== undefined) update.publishAt = dto.publishAt
    if (dto.expireAt !== undefined) update.expireAt = dto.expireAt

    // Meta
    if (dto.category !== undefined) update.category = dto.category
    if (dto.tags !== undefined) update.tags = dto.tags

    // Nếu schema có:
    // if (dto.allowedPermissions !== undefined) update.allowedPermissions = dto.allowedPermissions

    // Sửa nội dung nhỏ
    if (dto.title !== undefined) update.title = dto.title
    if (dto.content !== undefined) update.content = dto.content

    // Ràng buộc tối thiểu về thời gian
    if (update.publishAt && update.expireAt && update.expireAt <= update.publishAt) {
      throw new BadRequestException('expireAt must be greater than publishAt')
    }

    // (tuỳ schema) lưu người sửa
    if (opts?.updatedBy) {
      update.updatedBy = new Types.ObjectId(opts.updatedBy)
    }

    const doc = await this.noticeModel
      .findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .populate('attachments')
      .populate('createdBy')
      .lean()
      .exec()

    if (!doc) throw new NotFoundException('Notice not found')
    return doc
  }
}
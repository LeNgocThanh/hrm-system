import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Asset, AssetDocument, AssetSchema, AssetStatus } from './schemas/asset.schema';
import { AssetEvent, AssetEventDocument, AssetEventSchema, AssetEventType } from './schemas/asset-event.schema';
import { AssetDocument as AssetDoc, AssetDocumentDocument as AssetDocDocument } from './schemas/asset-document.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { CreateAssetEventDto } from './dto/create-event.dto';
import { CreateAssetDocumentDto } from './dto/create-asset-document.dto';
import { UpdateAssetDocumentDto } from './dto/update-asset-document.dto';
import { UserAssignmentsService } from 'src/user-assignments/user-assignments.service';
import { OrganizationsService } from 'src/organizations/organizations.service';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
    private readonly userAssignmentsService: UserAssignmentsService,
    private readonly organizationsService: OrganizationsService,
    @InjectModel(AssetEvent.name) private readonly eventModel: Model<AssetEventDocument>,
    @InjectModel(AssetDoc.name) private readonly assetDocumentModel: Model<AssetDocDocument>,
  ) { }

  async create(dto: CreateAssetDto) {
    const exists = await this.assetModel.exists({ code: dto.code });
    if (exists) throw new BadRequestException('Mã tài sản đã tồn tại');

    const doc = new this.assetModel({
      code: dto.code,
      name: dto.name,
      type: dto.type,
      model: dto.model,
      serialNumber: dto.serialNumber,
      purchasePrice: dto.purchasePrice != null ? { amount: dto.purchasePrice, currency: dto.currency || 'VND' } : undefined,
      purchaseDate: dto.purchaseDate,
      vendor: dto.vendor,
      location: dto.location,
      note: dto.note,
      metadata: dto.metadata,
      status: dto.status || AssetStatus.IN_STOCK,
      currentHolderId: dto.currentHolderId ? new Types.ObjectId(dto.currentHolderId) : null,
    });
    return doc.save();
  }

  async findAll(query: any, userId: string, roles: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'desc' ? -1 : 1;

    const filter: any = {};

    // Tìm kiếm toàn văn (search)
    if (query.search) {
      filter.$or = [
        { code: { $regex: query.search, $options: 'i' } },
        { name: { $regex: query.search, $options: 'i' } },
        { serialNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Lọc theo loại (type) và trạng thái (status)
    if (query.type) {
      filter.type = query.type;
    }
    if (query.status) {
      filter.status = query.status;
    }

    // Lọc theo metadata (xử lý các trường con)
    for (const key in query) {
      if (key.startsWith('metadata.')) {
        const metadataKey = key.split('.')[1];
        if (metadataKey) {
          filter[`metadata.${metadataKey}`] = query[key];
        }
      }
    }

    const moduleNames = ['All', 'Asset'];

    // Hàm tiện ích để kiểm tra quyền
    const hasPermission = (action: string) => {
      return roles.some(scope =>
        moduleNames.some(moduleName =>
          scope.groupedPermissions?.[moduleName]?.includes(action)
        )
      );
    };

    // 1. Kiểm tra quyền "manage"
    if (hasPermission('manage')) {
      // Có quyền manage => get tất cả
      const assets = await this.assetModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await this.assetModel.countDocuments(filter);

      return { assets, total };
    }

    // 2. Kiểm tra quyền "read"
    if (hasPermission('read')) {
      // Có quyền read => get toàn bộ cây tổ chức
      const userAssignments = await this.userAssignmentsService.findByUserId(userId);
      const userOrgIds = userAssignments.map(a => a.organizationId._id.toString());


      const allUsersInScope = new Set<string>();
      for (const orgId of userOrgIds) {
        const { users } = await this.organizationsService.findUsersInTree(orgId);
        users.forEach(user => allUsersInScope.add(user._id.toString()));
      }

      filter.currentHolderId = { $in: Array.from(allUsersInScope).map(id => new Types.ObjectId(id)) };
      const assets = await this.assetModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await this.assetModel.countDocuments(filter);

      return { assets, total };
    }

    // 3. Kiểm tra quyền "viewOwner"
    if (hasPermission('viewOwner')) {
      // Chỉ có quyền viewOwner => chỉ get của chính mình
      filter.currentHolderId = new Types.ObjectId(userId);
      const assets = await this.assetModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await this.assetModel.countDocuments(filter);

      return { assets, total };
    }

    // Nếu không có quyền nào thì trả về rỗng
    return [];

  }

  async findOne(id: string) {
    const doc = await this.assetModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Tài sản với ID "${id}" không tìm thấy`);
    }
    return doc;
  }

  async update(id: string, dto: UpdateAssetDto) {
    const existingDoc = await this.assetModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!existingDoc) {
      throw new NotFoundException(`Tài sản với ID "${id}" không tìm thấy`);
    }
    return existingDoc;
  }

  async remove(id: string) {
    const deleted = await this.assetModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Tài sản với ID "${id}" không tìm thấy`);
    }
    return deleted;
  }

  async removeEvent(id: string) {
    const deleted = await this.eventModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Event với ID "${id}" không tìm thấy`);
    }
    return deleted;
  }

  async assign(id: string, dto: AssignAssetDto) {
    const asset = await this.assetModel.findById(id).exec();
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    if (asset.status !== AssetStatus.IN_STOCK) throw new BadRequestException('Tài sản không có sẵn để bàn giao');

    const ev = new this.eventModel({
      assetId: new Types.ObjectId(id),
      type: AssetEventType.ASSIGN,
      toUserId: new Types.ObjectId(dto.toUserId),
      eventDate: dto.handoverDate,
    });

    asset.status = AssetStatus.ASSIGNED;
    asset.currentHolderId = new Types.ObjectId(dto.toUserId);

    await Promise.all([ev.save(), asset.save()]);

    return { asset, event: ev };
  }

  async findAssetsByHolderId(userId: string) {
    // Check if the user ID is a valid ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }

    // Convert string userId to ObjectId
    const holderId = new Types.ObjectId(userId);

    // Find all assets where currentHolderId matches the provided userId
    const assets = await this.assetModel.find({ currentHolderId: holderId }).lean().exec();

    // Return the found assets. If no assets are found, it will return an empty array.
    return assets;
  }

  async findAssetsByHolderIds(userIds: string[]) {
    // Check if the user ID is a valid ObjectId
    for (const userId of userIds) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('ID người dùng không hợp lệ');
      }
    }
    // Convert string userId to ObjectId
    const holderIds = userIds.map(id => new Types.ObjectId(id));

    // Find all assets where currentHolderId matches the provided userId
    const assets = await this.assetModel.find({ currentHolderId: { '$in': holderIds } }).lean().exec();

    // Return the found assets. If no assets are found, it will return an empty array.
    return assets;
  }

  async createEvent(assetId: string, dto: CreateAssetEventDto) {
    const asset = await this.assetModel.findById(assetId).exec();
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');

    // Tạo event; đảm bảo có eventDate
    const ev = new this.eventModel({
      ...dto,
      assetId: new Types.ObjectId(assetId),
      eventDate: (dto as any).eventDate ?? new Date(),
      actorId: dto.actorId ? new Types.ObjectId(dto.actorId) : undefined,
      fromUserId: dto.fromUserId ? new Types.ObjectId(dto.fromUserId) : undefined,
      toUserId: dto.toUserId ? new Types.ObjectId(dto.toUserId) : undefined,
    });

    // Cập nhật trạng thái tài sản phù hợp với loại event
    switch (dto.type) {
      case AssetEventType.RETURN:
        asset.currentHolderId = null;
        asset.status = AssetStatus.IN_STOCK;
        break;
      case AssetEventType.TRANSFER:
        if (!dto.toUserId) throw new BadRequestException('TRANSFER yêu cầu toUserId');
        asset.currentHolderId = new Types.ObjectId(dto.toUserId);
        asset.status = AssetStatus.ASSIGNED;
        break;
      case AssetEventType.REPAIR:
        asset.status = AssetStatus.IN_REPAIR;
        break;
      case AssetEventType.DISPOSE:
        asset.currentHolderId = null;
        asset.status = AssetStatus.DISPOSED;
        break;
      case AssetEventType.LOSS:
        asset.status = AssetStatus.LOST;
        break;
      case AssetEventType.ASSIGN:
        if (!dto.toUserId) throw new BadRequestException('ASSIGN yêu cầu toUserId');
        asset.currentHolderId = new Types.ObjectId(dto.toUserId);
        asset.status = AssetStatus.ASSIGNED;
        break;
      default:
        // các loại khác giữ nguyên trạng thái nếu bạn muốn
        break;
    }

    // LƯU CẢ HAI: event + asset
    await Promise.all([ev.save(), asset.save()]);
    return { asset, event: ev };
  }


  async history(assetId: string) {
    const id = new Types.ObjectId(assetId);
    const events = await this.eventModel.find({ assetId: id }).sort({ eventDate: -1 }).lean();
    return events;
  }

  // === Methods for Asset Documents ===

  async createAssetDocument(assetId: string, dto: CreateAssetDocumentDto) {
    const asset = await this.assetModel.findById(assetId);
    if (!asset) {
      throw new NotFoundException(`Tài sản với ID "${assetId}" không tìm thấy.`);
    }

    const createdDoc = new this.assetDocumentModel({
      ...dto,
      assetId: new Types.ObjectId(assetId),
      ownerUserId: dto.ownerUserId ? new Types.ObjectId(dto.ownerUserId) : undefined,
      fileId: new Types.ObjectId(dto.fileId),
    });
    return createdDoc.save();
  }

  async findAssetDocuments(assetId: string) {
    const asset = await this.assetModel.findById(assetId);
    if (!asset) {
      throw new NotFoundException(`Tài sản với ID "${assetId}" không tìm thấy.`);
    }

    return this.assetDocumentModel.find({ assetId: new Types.ObjectId(assetId) }).exec();
  }

  async updateAssetDocument(docId: string, dto: UpdateAssetDocumentDto) {
    const existingDoc = await this.assetDocumentModel.findByIdAndUpdate(docId, dto, { new: true }).exec();
    if (!existingDoc) {
      throw new NotFoundException(`Tài liệu tài sản với ID "${docId}" không tìm thấy`);
    }
    return existingDoc;
  }

  async removeAssetDocument(docId: string) {
    const deletedDoc = await this.assetDocumentModel.findByIdAndDelete(docId).exec();
    if (!deletedDoc) {
      throw new NotFoundException(`Tài liệu tài sản với ID "${docId}" không tìm thấy`);
    }
    return deletedDoc;
  }
}
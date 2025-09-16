import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organizations.schema';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationResponseDto } from './dto';
import { UserAssignment, UserAssignmentDocument } from '../user-assignments/schemas/user-assignment.schema';
import { UserAssignmentsService } from 'src/user-assignments/user-assignments.service';

@Injectable()
export class OrganizationsService {
  constructor(@InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
@InjectModel(UserAssignment.name)
    private userAssignmentModel: Model<UserAssignmentDocument>,
    private readonly userAssignmentsService: UserAssignmentsService,
) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    const createdOrganization = await this.organizationModel.create(createOrganizationDto);
    return createdOrganization.toObject() as unknown as OrganizationResponseDto;
  }

  async findAll(type?: string): Promise<OrganizationResponseDto[]> {
    const filter = type ? { type } : {};
    const organizations = await this.organizationModel.find(filter).exec();
    return organizations.map(org => org.toObject() as unknown as OrganizationResponseDto);
  }

  async findRootOrganizations(): Promise<OrganizationResponseDto[]> {
    const rootOrganizations = await this.organizationModel.find({ parent: null }).exec();
    return rootOrganizations.map(org => org.toObject() as unknown as OrganizationResponseDto);
  }

  async findOne(id: string): Promise<OrganizationResponseDto> {
    const organization = await this.organizationModel.findById(id).exec();
    return organization?.toObject() as unknown as OrganizationResponseDto;
  }

  async findChildren(parentId: string): Promise<OrganizationResponseDto[]> {
    const children = await this.organizationModel.find({ parent: parentId }).exec();
    return children.map(child => child.toObject() as unknown as OrganizationResponseDto);
  }

  async findAncestors(id: string): Promise<OrganizationResponseDto[]> {
    const organization = await this.organizationModel.findById(id).exec();
    if (!organization || !organization.parent) {
      return [];
    }

    const ancestors: OrganizationResponseDto[] = [];
    let currentParentId = organization.parent;

    while (currentParentId) {
      const parent = await this.organizationModel.findById(currentParentId).exec();
      if (parent) {
        ancestors.unshift(parent.toObject() as unknown as OrganizationResponseDto);
        currentParentId = parent.parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  async findDescendants(id: string): Promise<OrganizationResponseDto[]> {
    const descendants: OrganizationResponseDto[] = [];
    
    const findDescendantsRecursive = async (parentId: string) => {
      const children = await this.organizationModel.find({ parent: parentId }).exec();
      
      for (const child of children) {
        const childDto = child.toObject() as unknown as OrganizationResponseDto;
        descendants.push(childDto);
        await findDescendantsRecursive(child._id.toString());
      }
    };

    await findDescendantsRecursive(id);
    return descendants;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<OrganizationResponseDto> {
    const updatedOrganization = await this.organizationModel.findByIdAndUpdate(id, updateOrganizationDto, { new: true }).exec();
    return updatedOrganization?.toObject() as unknown as OrganizationResponseDto;
  }

  async delete(id: string): Promise<OrganizationResponseDto> {
    
    const deletedOrganization = await this.organizationModel.findByIdAndDelete(id).exec();
    // Xoá các UserAssignment liên quan đến tổ chức này
    await this.userAssignmentModel.deleteMany({ organizationId: id }).exec();
    return deletedOrganization?.toObject() as unknown as OrganizationResponseDto;
  }

  /**
   * Lấy tất cả USERS thuộc orgId và mọi descendant của nó
   * @param orgId id của tổ chức gốc
   * @param opts  tuỳ chọn lọc
   *   - includeInactive: mặc định false → chỉ lấy assignment đang active
   *   - fields: các trường của user cần trả về (mặc định: username, email, firstName, lastName)
   */
async findUsersInTree(
    orgId: string,
    opts?: { includeInactive?: boolean; fields?: string }
  ): Promise<{
    totalUsers: number;
    users: Array<{
      _id: Types.ObjectId;     
      email?: string;     
      fullName?: string;
      phone?: string;
      gender: string;
      assignments: Array<{
        organizationId: Types.ObjectId;
        positionId?: Types.ObjectId;
        isPrimary?: boolean;
        isActive?: boolean;
        timeIn?: Date;
        timeOut?: Date;
      }>;
    }>;
  }> {
    // 1) gom toàn bộ orgIds = [orgId, ...descendantIds]
   
    const root = await this.organizationModel.findById(orgId).exec();       
    if (!root) return { totalUsers: 0, users: [] };

    const orgObjectIds: Types.ObjectId[] = [new Types.ObjectId(root._id as any)];   

    // nếu đã có sẵn method findDescendants(id) → dùng lại:
    const descendants = await this.findDescendants(orgId);
    descendants.forEach(d => {
      // d._id là string? ép về ObjectId nếu cần
      orgObjectIds.push(((d as any)._id as any));
    });
    const orgIds: string[] = orgObjectIds.map(id => id.toString());

    // 2) dựng filter cho UserAssignment
    
    const filter: any = { organizationId: { $in: orgIds } };
    

    if (!(opts?.includeInactive)) filter.isActive = true;

    // 3) query assignments + populate user
   // const fields = opts?.fields ?? 'email phone gender fullName';   
    const assignments = await this.userAssignmentModel
      .find(filter)
      .populate('userId')
      .lean()
      .exec();
      

    // 4) map → group theo userId + khử trùng lặp user
    const userMap = new Map<string, any>();
    for (const a of assignments) {
      const u = a.userId as any; // đã populate
      if (!u?._id) continue;
      const key = String(u._id);

      if (!userMap.has(key)) {
        userMap.set(key, {
          _id: u._id,
          fullName: u.fullName,
          email: u.email,    
          phone: u.phone,
          gender: u. gender,
          assignments: [],
        });
      }
      userMap.get(key).assignments.push({
        organizationId: a.organizationId,
        positionId: a.positionId,
        isPrimary: a.isPrimary,
        isActive: a.isActive,
       timeIn: a.timeIn,
       timeOut: a.timeOut,
      });
    }

    const users = Array.from(userMap.values());
    return { totalUsers: users.length, users };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserPolicyBinding, UserPolicyBindingDocument } from './schemas/user-policy-binding.schema';
import { CreateUserPolicyBindingDto } from './dto/create-user-policy-binding.dto';
import { UpdateUserPolicyBindingDto } from './dto/update-policy-binding.dto';
import { ListUserPolicyQueryDto } from './dto/list-user-policy-query.dto';
import { ResolveUserPolicyQueryDto } from './dto/resolve-user-policy-query.dto';
// Bạn có thể giữ lại các hàm này nếu chúng hữu ích cho việc chuẩn hóa/kiểm tra logic backend
// import { containsDate, normFrom, normTo, TO_MAX } from '../common/effective-range';

@Injectable()
export class UserPolicyBindingService {
  constructor(
    @InjectModel(UserPolicyBinding.name)
    private userPolicyBindingModel: Model<UserPolicyBindingDocument>,
  ) {}

  /**
   * Tạo một ràng buộc chính sách mới
   * @param createUserPolicyBindingDto DTO chứa dữ liệu tạo
   * @returns Document đã được tạo
   */
  async create(createUserPolicyBindingDto: CreateUserPolicyBindingDto): Promise<UserPolicyBindingDocument> {
    const createdBinding = new this.userPolicyBindingModel(createUserPolicyBindingDto);
    return createdBinding.save();
  }

  /**
   * Lấy tất cả ràng buộc, có hỗ trợ phân trang và lọc
   * @param query Lọc theo userId, policyType, onDate, page, limit
   * @returns Danh sách ràng buộc
   */
  async findAll(query: ListUserPolicyQueryDto): Promise<UserPolicyBindingDocument[]> {
    const { userId, policyType, onDate, page = 1, limit = 20 } = query;
    const findQuery: Record<string, any> = {};

    if (userId) {
      findQuery.userId = userId;
    }
    if (policyType) {
      findQuery.policyType = policyType;
    }

    // Lọc theo ngày hiệu lực (onDate)
    if (onDate) {
      // onDate đã được xác thực là chuỗi YYYY-MM-DD, không cần dùng dayjs để định dạng lại.
      const dateString = onDate;

      // Điều kiện tìm kiếm: (effectiveFrom <= onDate) AND (effectiveTo >= onDate)
      // Mongoose/MongoDB sẽ so sánh chuỗi YYYY-MM-DD an toàn theo thứ tự từ điển.
      findQuery.$and = [
        // effectiveFrom <= onDate (hoặc effectiveFrom không tồn tại/null)
        { $or: [
            { effectiveFrom: { $lte: dateString } },
            { effectiveFrom: { $eq: null } }
        ]},
        // effectiveTo >= onDate (hoặc effectiveTo không tồn tại/null)
        { $or: [
            { effectiveTo: { $gte: dateString } },
            { effectiveTo: { $eq: null } }
        ]}
      ];
    }

    return this.userPolicyBindingModel
      .find(findQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  /**
   * Lấy một ràng buộc chính sách bằng ID
   * @param id ID của ràng buộc
   * @returns Document ràng buộc
   */
  async findOne(id: string): Promise<UserPolicyBindingDocument> {
    const binding = await this.userPolicyBindingModel.findById(id).exec();
    if (!binding) {
      throw new NotFoundException(`UserPolicyBinding with ID ${id} not found`);
    }
    return binding;
  }

  /**
   * Cập nhật một ràng buộc chính sách bằng ID
   * @param id ID của ràng buộc
   * @param updateDto DTO chứa dữ liệu cập nhật
   * @returns Document đã được cập nhật
   */
  async update(id: string, updateDto: UpdateUserPolicyBindingDto): Promise<UserPolicyBindingDocument> {
    const updatedBinding = await this.userPolicyBindingModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .exec();

    if (!updatedBinding) {
      throw new NotFoundException(`UserPolicyBinding with ID ${id} not found`);
    }
    return updatedBinding;
  }

  /**
   * Xóa một ràng buộc chính sách bằng ID
   * @param id ID của ràng buộc
   */
  async remove(id: string): Promise<void> {
    const result = await this.userPolicyBindingModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`UserPolicyBinding with ID ${id} not found`);
    }
  }

  /**
   * Hàm truy vấn đặc biệt: tìm chính sách cụ thể có hiệu lực tại một ngày
   * Dùng để "giải quyết" (resolve) chính sách cho một người dùng tại một thời điểm
   * @param resolveQuery DTO chứa userId, policyType và onDate
   * @returns Document ràng buộc duy nhất (hoặc null nếu không tìm thấy)
   */
  async resolvePolicy(resolveQuery: ResolveUserPolicyQueryDto): Promise<UserPolicyBindingDocument | null> {
    const { userId, policyType, onDate } = resolveQuery;
    // onDate đã được xác thực là chuỗi YYYY-MM-DD, không cần dùng dayjs.
    const dateString = onDate;

    // Tìm kiếm chính sách có hiệu lực tại ngày onDate
    const binding = await this.userPolicyBindingModel.findOne({
      userId: userId,
      policyType: policyType,
      $and: [
          // effectiveFrom <= onDate (hoặc effectiveFrom không tồn tại/null)
          { $or: [
              { effectiveFrom: { $lte: dateString } },
              { effectiveFrom: { $eq: null } }
          ]},
          // effectiveTo >= onDate (hoặc effectiveTo không tồn tại/null)
          { $or: [
              { effectiveTo: { $gte: dateString } },
              { effectiveTo: { $eq: null } }
          ]}
      ]
    })
    // Giả định chỉ có 1 chính sách được phép áp dụng tại một thời điểm (nếu không, cần thêm logic chọn cái ưu tiên nhất)
    .exec();

    return binding;
  }
}
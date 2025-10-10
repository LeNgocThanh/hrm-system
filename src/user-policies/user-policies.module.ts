import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserPolicyBindingService } from './user-policies.service';
import { UserPolicyBindingController } from './user-policies.controller';
import { UserPolicyBinding, UserPolicyBindingSchema } from './schemas/user-policy-binding.schema'; // Cần chỉnh sửa đường dẫn nếu cần

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPolicyBinding.name, schema: UserPolicyBindingSchema },
    ]),
  ],
  controllers: [UserPolicyBindingController],
  providers: [UserPolicyBindingService],
  exports: [UserPolicyBindingService],
})
export class UserPoliciesModule {}
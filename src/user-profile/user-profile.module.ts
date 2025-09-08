import { Module } from '@nestjs/common';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: UserProfile.name, schema: UserProfileSchema }])],
  controllers: [UserProfileController],
  providers: [UserProfileService]
})
export class UserProfileModule {}

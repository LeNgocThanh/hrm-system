import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAccountsService } from './user-accounts.service';
import { UserAccountsController } from './user-accounts.controller';
import { UserAccount, UserAccountSchema } from './schemas/user-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAccount.name, schema: UserAccountSchema }
    ])
  ],
  controllers: [UserAccountsController],
  providers: [UserAccountsService],
  exports: [UserAccountsService],
})
export class UserAccountsModule {}

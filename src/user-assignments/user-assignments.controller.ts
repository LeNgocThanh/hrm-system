import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import { UserAssignmentsService } from './user-assignments.service';
import { CreateUserAssignmentDto } from './dto/create-user-assignment.dto';
import { UpdateUserAssignmentDto } from './dto/update-user-assignment.dto';
import { QueryUserAssignmentDto } from './dto/query-user-assignment.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';



@Controller('user-assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserAssignmentsController {
  constructor(private readonly userAssignmentsService: UserAssignmentsService) { }

  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserAssignmentDto: CreateUserAssignmentDto, @Req() req: any) {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.userAssignmentsService.create(createUserAssignmentDto, userId, roles);
  }


  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  @Get()
  findAll(@Query() query: QueryUserAssignmentDto) {
    return this.userAssignmentsService.findAll(query);
  }

  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userAssignmentsService.findOne(id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.userAssignmentsService.findByCode(code);
  }

  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.userAssignmentsService.findByUserId(userId);
  }


  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  @Get('organization/:organizationId')
  findByOrganizationId(@Param('organizationId') organizationId: string) {
    return this.userAssignmentsService.findByOrganizationId(organizationId);
  }


  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserAssignmentDto: UpdateUserAssignmentDto) {
    return this.userAssignmentsService.update(id, updateUserAssignmentDto);
  }


  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  @Put(':id')
  updatePut(@Param('id') id: string, @Body() updateUserAssignmentDto: UpdateUserAssignmentDto) {
    return this.userAssignmentsService.update(id, updateUserAssignmentDto);
  }


  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.userAssignmentsService.deactivate(id);
  }


  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.userAssignmentsService.remove(id);
  }
}

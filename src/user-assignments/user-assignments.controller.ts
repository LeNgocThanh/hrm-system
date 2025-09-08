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
} from '@nestjs/common';
import { UserAssignmentsService } from './user-assignments.service';
import { CreateUserAssignmentDto } from './dto/create-user-assignment.dto';
import { UpdateUserAssignmentDto } from './dto/update-user-assignment.dto';
import { QueryUserAssignmentDto } from './dto/query-user-assignment.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@Controller('user-assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserAssignmentsController {
  constructor(private readonly userAssignmentsService: UserAssignmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserAssignmentDto: CreateUserAssignmentDto) {
    return this.userAssignmentsService.create(createUserAssignmentDto);
  }

  @Get()
  findAll(@Query() query: QueryUserAssignmentDto) {
    return this.userAssignmentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userAssignmentsService.findOne(id);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.userAssignmentsService.findByUserId(userId);
  }

  @Get('organization/:organizationId')
  findByOrganizationId(@Param('organizationId') organizationId: string) {
    return this.userAssignmentsService.findByOrganizationId(organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserAssignmentDto: UpdateUserAssignmentDto) {
    return this.userAssignmentsService.update(id, updateUserAssignmentDto);
  }

  @Put(':id')
  updatePut(@Param('id') id: string, @Body() updateUserAssignmentDto: UpdateUserAssignmentDto) {
    return this.userAssignmentsService.update(id, updateUserAssignmentDto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.userAssignmentsService.deactivate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.userAssignmentsService.remove(id);
  }
}

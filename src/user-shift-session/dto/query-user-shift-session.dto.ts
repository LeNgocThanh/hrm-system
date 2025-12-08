import { IsArray, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class QueryUserShiftSessionDto {
    @IsArray()
    @IsString({ each: true })
    userIds!: string[];

    @IsString()
    from!: string; // 'YYYY-MM-DD'

    @IsString()
    to!: string; // 'YYYY-MM-DD'  
}
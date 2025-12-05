import { OmitType, PartialType } from '@nestjs/mapped-types';
import { PASSWORD_REQUIREMENTS } from '@shared/constants';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['username'])) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_REQUIREMENTS.MIN_LENGTH)
  password?: string;
}

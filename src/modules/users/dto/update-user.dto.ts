import { IsEmail, IsOptional, IsBoolean, IsString, IsEnum, MinLength } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { UserRole } from '../../../../../frontend/src/shared/types/enum';
import { PASSWORD_REQUIREMENTS } from '../../../../../frontend/src/shared/constants';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['username'])) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_REQUIREMENTS.MIN_LENGTH)
  password?: string;
}

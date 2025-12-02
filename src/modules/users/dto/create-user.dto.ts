import { IsEmail, IsEnum, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';
import { UserRole } from '@shared/types/enum';
import { USERNAME_REQUIREMENTS, PASSWORD_REQUIREMENTS } from '@shared/constants';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(USERNAME_REQUIREMENTS.MIN_LENGTH, USERNAME_REQUIREMENTS.MAX_LENGTH)
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(PASSWORD_REQUIREMENTS.MIN_LENGTH)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(UserRole)
  role: UserRole;
}

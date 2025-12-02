import { IsString, IsUUID, MaxLength } from 'class-validator';

export class SaveAnswerDto {
  @IsUUID()
  questionId: string;

  @IsString()
  @MaxLength(5000, { message: 'Answer is too long' })
  answer: string;
}

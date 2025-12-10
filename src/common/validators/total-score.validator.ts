import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { CreateQuestionDto } from '../../modules/tests/dto/create-question.dto';

export function ValidateTotalScore(targetScore: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validateTotalScore',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [targetScore],
      options: validationOptions,
      validator: {
        validate(questions: CreateQuestionDto[], args: ValidationArguments) {
          // Skip validation if questions are not provided (optional field)
          if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return true;
          }

          const totalScore = questions.reduce((sum, q) => {
            return sum + (Number(q.score) || 0);
          }, 0);

          const target = args.constraints[0];
          return Math.abs(totalScore - target) < 0.01; // Allow for floating point precision
        },
        defaultMessage(args: ValidationArguments) {
          const target = args.constraints[0];
          const questions = args.value as CreateQuestionDto[];
          const totalScore = questions?.reduce((sum, q) => sum + (Number(q.score) || 0), 0) || 0;

          return `Total score must equal ${target}. Current total: ${totalScore.toFixed(2)}. Difference: ${(totalScore - target).toFixed(2)}`;
        },
      },
    });
  };
}

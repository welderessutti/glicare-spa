import { ExamResultSchema } from './exam-result-schema';

export type ExamResultSchemaOption = Pick<ExamResultSchema, 'id' | 'code' | 'name' | 'active'>;

import { ExamResultSchema } from './exam-result-schema';

export interface ExamType {
  id: string;
  code: string;
  name: string;
  active: boolean;
  resultSchemas: ExamResultSchema[];
}

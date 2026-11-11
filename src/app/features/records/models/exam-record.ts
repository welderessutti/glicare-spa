import { ExamResultSchemaReference } from './exam-result-schema-reference';
import { ExamTypeReference } from './exam-type-reference';
import { ExamResult } from './exam-result';

export interface ExamRecord {
  id: string;
  userId: string;
  examType: ExamTypeReference;
  examResultSchema: ExamResultSchemaReference;
  examDate: string;
  createdAt: string;
  examResults: ExamResult[];
}

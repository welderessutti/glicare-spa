import { ExamType } from './exam-type';
import { ExamTypeCode } from './exam-type-code';
import { ExamResult } from './exam-result';

export interface ExamRecord {
  id: string;
  userId: string;
  // Preserve the legacy record response until records migrate to result schemas.
  examType: Omit<ExamType, 'code' | 'resultSchemas'> & { code: ExamTypeCode };
  examDate: string;
  createdAt: string;
  examResults: ExamResult[];
}

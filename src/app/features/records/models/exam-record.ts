import { ExamType } from './exam-type';
import { ExamResult } from './exam-result';

export interface ExamRecord {
  id: string;
  userId: string;
  examType: ExamType;
  examDate: string;
  createdAt: string;
  examResults: ExamResult[];
}

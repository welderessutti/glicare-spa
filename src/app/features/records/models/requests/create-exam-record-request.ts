import { ExamTypeCode } from '../exam-type-code';
import { CreateExamResultRequest } from './create-exam-result-request';

export interface CreateExamRecordRequest {
  examTypeCode: ExamTypeCode;
  examDate: string;
  examResults: CreateExamResultRequest[];
}

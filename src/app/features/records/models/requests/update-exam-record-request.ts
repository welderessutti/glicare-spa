import { UpdateExamResultRequest } from './update-exam-result-request';

export interface UpdateExamRecordRequest {
  examDate: string;
  examResults: UpdateExamResultRequest[];
}

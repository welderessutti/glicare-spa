import { CreateExamResultRequest } from './create-exam-result-request';

export interface CreateExamRecordRequest {
  examTypeCode: string;
  examResultSchemaCode: string;
  examDate: string;
  examResults: CreateExamResultRequest[];
}

import { ExamTypeCode } from '../exam-type-code';

export interface ExamRecordFiltersRequest {
  type?: ExamTypeCode;
  date?: string;
  result?: number;
  page?: number;
  size?: number;
  sortBy?: 'examDate' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

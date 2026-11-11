export interface ExamRecordFiltersRequest {
  type?: string;
  date?: string;
  result?: number;
  page?: number;
  size?: number;
  sortBy?: 'examDate' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

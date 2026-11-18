export interface ExamRecordFiltersRequest {
  type?: string;
  page?: number;
  size?: number;
  sortBy?: 'examDate' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

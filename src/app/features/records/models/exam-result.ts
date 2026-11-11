import { ExamResultDefinition } from './exam-result-definition';

export interface ExamResult {
  id: string;
  resultDefinition: ExamResultDefinition;
  value: number;
}

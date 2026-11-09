import { ExamResultDefinition } from './exam-result-definition';

export interface ExamResultSchema {
  id: string;
  code: string;
  name: string;
  active: boolean;
  resultDefinitions: ExamResultDefinition[];
}

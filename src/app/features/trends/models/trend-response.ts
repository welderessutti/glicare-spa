import { ExamTypeReference } from '../../records/models/exam-type-reference';
import { TrendPoint } from './trend-point';

export interface TrendResponse {
  examType: ExamTypeReference;
  resultDefinition: {
    code: string;
    label: string;
    unit: string;
    active: boolean;
  };
  points: TrendPoint[];
}

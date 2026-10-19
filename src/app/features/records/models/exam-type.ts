import { ExamTypeCode } from './exam-type-code';

export interface ExamType {
  id: string;
  code: ExamTypeCode;
  name: string;
  active: boolean;
}

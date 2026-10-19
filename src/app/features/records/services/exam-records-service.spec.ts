import { TestBed } from '@angular/core/testing';
import { ExamRecordsService } from './exam-records-service';

describe('ExamRecordsService', () => {
  let service: ExamRecordsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExamRecordsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

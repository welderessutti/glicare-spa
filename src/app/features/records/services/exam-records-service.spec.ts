import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExamRecordsService } from './exam-records-service';
import { ExamRecord } from '../models/exam-record';
import { API_URL } from '../../../core/config/api-url';
import { CreateExamRecordRequest } from '../models/requests/create-exam-record-request';
import { UpdateExamRecordRequest } from '../models/requests/update-exam-record-request';

describe('ExamRecordsService', () => {
  let service: ExamRecordsService;
  let http: HttpTestingController;
  const url = `${API_URL}/exam-records`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExamRecordsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists records with the existing filters and array response contract', () => {
    let response: ExamRecord[] | undefined;
    service
      .getAll({
        type: 'GLU',
        date: '2026-10-20',
        result: 0,
        page: 0,
        size: 20,
        sortBy: 'examDate',
        sortDirection: 'desc',
      })
      .subscribe((records) => {
        response = records;
      });
    const request = http.expectOne((req) => req.url === url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual([
      'date',
      'page',
      'result',
      'size',
      'sort',
      'type',
    ]);
    expect(request.request.params.get('type')).toBe('GLU');
    expect(request.request.params.get('date')).toBe('2026-10-20');
    expect(request.request.params.get('result')).toBe('0');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('examDate,desc');
    request.flush([]);
    expect(response).toEqual([]);
  });

  it('creates using only the provided creation DTO', () => {
    const body: CreateExamRecordRequest = {
      examTypeCode: 'HBA1C',
      examDate: '2026-10-20',
      examResults: [{ label: 'Result', value: 6.5 }],
    };
    service.create(body).subscribe();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('updates by the exam record ID using the existing result-ID contract', () => {
    const body: UpdateExamRecordRequest = {
      examDate: '2026-10-20',
      examResults: [{ id: 'server-result-id', value: 112 }],
    };
    service.updateById('server-record-id', body).subscribe();
    const request = http.expectOne(`${url}/server-record-id`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('deletes only by the exam record ID without a request body', () => {
    service.deleteById('server-record-id').subscribe();
    const request = http.expectOne(`${url}/server-record-id`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});

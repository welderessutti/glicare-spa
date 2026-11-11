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
  const definition = {
    id: 'definition-panel-first',
    code: 'FIRST',
    label: 'First measurement',
    unit: 'unit A',
    active: true,
  };
  const record: ExamRecord = {
    id: 'record-panel',
    userId: 'user-001',
    examDate: '2026-10-20',
    createdAt: '2026-10-20T12:00:00Z',
    examType: { code: 'PANEL', name: 'Synthetic panel' },
    examResultSchema: { code: 'STANDARD', name: 'Standard', active: true },
    examResults: [
      {
        id: 'result-panel-first',
        resultDefinition: definition,
        value: 6.5,
      },
    ],
  };

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
        type: 'PANEL',
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
    expect(request.request.params.get('type')).toBe('PANEL');
    expect(request.request.params.get('date')).toBe('2026-10-20');
    expect(request.request.params.get('result')).toBe('0');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('examDate,desc');
    request.flush([record]);
    expect(response).toEqual([record]);
  });

  it('reads a record with its schema, exam type and historical result definitions', () => {
    const inactiveDefinition = { ...definition, active: false };
    const historical: ExamRecord = {
      ...record,
      examResultSchema: {
        ...record.examResultSchema,
        active: false,
      },
      examResults: [
        {
          id: 'historical-result',
          resultDefinition: inactiveDefinition,
          value: 7,
        },
      ],
    };
    let response: ExamRecord | undefined;
    service.getById(record.id).subscribe((value) => {
      response = value;
    });
    const request = http.expectOne(`${url}/${record.id}`);
    expect(request.request.method).toBe('GET');
    request.flush(historical);
    expect(response).toEqual(historical);
  });

  it('creates using only the provided creation DTO', () => {
    const body: CreateExamRecordRequest = {
      examTypeCode: 'PANEL',
      examResultSchemaCode: 'STANDARD',
      examDate: '2026-10-20',
      examResults: [{ resultDefinitionCode: 'FIRST', value: 6.5 }],
    };
    let response: ExamRecord | undefined;
    service.create(body).subscribe((value) => {
      response = value;
    });
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(record);
    expect(response).toEqual(record);
  });

  it('updates by the exam record ID using the existing result-ID contract', () => {
    const body: UpdateExamRecordRequest = {
      examDate: '2026-10-20',
      examResults: [
        { id: 'server-result-id', value: 112 },
        { id: 'second-result-id', value: 0 },
      ],
    };
    let response: ExamRecord | undefined;
    service.updateById('server-record-id', body).subscribe((value) => {
      response = value;
    });
    const request = http.expectOne(`${url}/server-record-id`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush(record);
    expect(response).toEqual(record);
  });

  it('deletes only by the exam record ID without a request body', () => {
    service.deleteById('server-record-id').subscribe();
    const request = http.expectOne(`${url}/server-record-id`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});

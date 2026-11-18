import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExamTypesService } from './exam-types-service';
import { ExamType } from '../models/exam-type';
import { ExamResultDefinition } from '../models/exam-result-definition';
import { API_URL } from '../../../core/config/api-url';

describe('ExamTypesService', () => {
  let service: ExamTypesService;
  let http: HttpTestingController;
  const examTypes: ExamType[] = [
    { id: 'type-hba1c', code: 'HBA1C', name: 'Hemoglobin A1c', active: true },
    { id: 'type-glu', code: 'GLU', name: 'Blood Glucose', active: true },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExamTypesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the lean exam catalog without nested schemas or definitions', () => {
    let response: ExamType[] | undefined;
    service.getAll().subscribe((types) => {
      response = types;
    });
    const request = http.expectOne(`${API_URL}/exam-types`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(examTypes);
    expect(response).toEqual(examTypes);
  });

  it('loads active and inactive definitions belonging to an exam type', () => {
    const definitions: ExamResultDefinition[] = [
      { id: 'percent', code: 'PERCENT', label: 'Percentage', unit: '%', active: true },
      { id: 'avg', code: 'AVG', label: 'Estimated average glucose', unit: 'mg/dL', active: false },
    ];
    let response: ExamResultDefinition[] | undefined;
    service.getResultDefinitions('PANEL').subscribe((value) => {
      response = value;
    });
    const request = http.expectOne(`${API_URL}/exam-types/PANEL/result-definitions`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(definitions);
    expect(response).toEqual(definitions);
  });

  it('encodes backend-defined exam codes in the definitions URL', () => {
    service.getResultDefinitions('PANEL/2 +').subscribe();
    const request = http.expectOne(`${API_URL}/exam-types/PANEL%2F2%20%2B/result-definitions`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('loads lightweight active exam options without requesting nested catalog data', () => {
    const options = [{ id: 'type-panel', code: 'PANEL', name: 'Panel', active: true }];
    service.getActive().subscribe((value) => expect(value).toEqual(options));
    const request = http.expectOne(`${API_URL}/exam-types?active=true`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['active']);
    request.flush(options);
  });

  it('loads active schema options for an encoded exam code', () => {
    const options = [{ id: 'schema', code: 'STANDARD', name: 'Standard', active: true }];
    service
      .getActiveResultSchemas('PANEL/2 +')
      .subscribe((value) => expect(value).toEqual(options));
    const request = http.expectOne(
      `${API_URL}/exam-types/PANEL%2F2%20%2B/result-schemas?active=true`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['active']);
    request.flush(options);
  });

  it('loads only active definitions belonging to the encoded exam and schema', () => {
    const definitions: ExamResultDefinition[] = [
      { id: 'first', code: 'FIRST', label: 'First', unit: '%', active: true },
    ];
    service
      .getActiveSchemaResultDefinitions('PANEL/2 +', 'STANDARD/1 +')
      .subscribe((value) => expect(value).toEqual(definitions));
    const request = http.expectOne(
      `${API_URL}/exam-types/PANEL%2F2%20%2B/result-schemas/STANDARD%2F1%20%2B/result-definitions?active=true`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['active']);
    request.flush(definitions);
  });
});

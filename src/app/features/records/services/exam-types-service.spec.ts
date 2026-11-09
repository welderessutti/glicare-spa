import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExamTypesService } from './exam-types-service';
import { ExamType } from '../models/exam-type';
import { API_URL } from '../../../core/config/api-url';

describe('ExamTypesService', () => {
  let service: ExamTypesService;
  let http: HttpTestingController;
  const examTypes: ExamType[] = [
    {
      id: 'type-hba1c',
      code: 'HBA1C',
      name: 'Hemoglobin A1c',
      active: true,
      resultSchemas: [
        {
          id: 'schema-hba1c-standard',
          code: 'STANDARD',
          name: 'Standard',
          active: true,
          resultDefinitions: [
            {
              id: 'definition-hba1c-result',
              code: 'RESULT',
              label: 'Result',
              unit: '%',
              active: true,
            },
          ],
        },
      ],
    },
    {
      id: 'type-glu',
      code: 'GLU',
      name: 'Blood Glucose',
      active: true,
      resultSchemas: [
        {
          id: 'schema-glu-standard',
          code: 'STANDARD',
          name: 'Standard',
          active: true,
          resultDefinitions: [
            {
              id: 'definition-glu-result',
              code: 'RESULT',
              label: 'Result',
              unit: 'mg/dL',
              active: true,
            },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExamTypesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the exam catalog with its result schemas and definitions', () => {
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
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import { TrendResponse } from '../models/trend-response';
import { TrendsService } from './trends-service';

describe('TrendsService', () => {
  let service: TrendsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrendsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests only examType and resultDefinition and returns the analytical response unchanged', () => {
    const response: TrendResponse = {
      examType: { code: 'PANEL', name: 'Backend panel' },
      resultDefinition: { code: 'FIRST', label: 'First measurement', unit: 'units', active: false },
      points: [{ examDate: '2026-11-01', value: 1.25 }],
    };
    service.get('PANEL', 'FIRST').subscribe((value) => expect(value).toEqual(response));
    const request = http.expectOne(`${API_URL}/trends?examType=PANEL&resultDefinition=FIRST`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['examType', 'resultDefinition']);
    request.flush(response);
  });

  it('safely encodes backend codes as query values and accepts an empty metric', () => {
    const response: TrendResponse = {
      examType: { code: 'PANEL/2 +&', name: 'Panel' },
      resultDefinition: { code: 'FIELD? +&', label: 'Field', unit: '', active: true },
      points: [],
    };
    service
      .get(response.examType.code, response.resultDefinition.code)
      .subscribe((value) => expect(value).toEqual(response));
    const request = http.expectOne((req) => req.url === `${API_URL}/trends`);
    expect(request.request.params.get('examType')).toBe(response.examType.code);
    expect(request.request.params.get('resultDefinition')).toBe(response.resultDefinition.code);
    expect(request.request.urlWithParams).toContain('%26');
    expect(request.request.params.keys().sort()).toEqual(['examType', 'resultDefinition']);
    request.flush(response);
  });
});

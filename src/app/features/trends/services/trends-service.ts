import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/config/api-url';
import { TrendResponse } from '../models/trend-response';

@Service()
export class TrendsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = 'trends';

  public get(examTypeCode: string, resultDefinitionCode: string): Observable<TrendResponse> {
    return this.http.get<TrendResponse>(`${this.apiUrl}/${this.slug}`, {
      params: { examType: examTypeCode, resultDefinition: resultDefinitionCode },
    });
  }
}

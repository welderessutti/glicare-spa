import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/config/api-url';
import { Observable } from 'rxjs';
import { ExamType } from '../models/exam-type';
import { ExamResultDefinition } from '../models/exam-result-definition';

@Service()
export class ExamTypesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = 'exam-types';

  public getAll(): Observable<ExamType[]> {
    return this.http.get<ExamType[]>(`${this.apiUrl}/${this.slug}`);
  }

  public getResultDefinitions(examTypeCode: string): Observable<ExamResultDefinition[]> {
    return this.http.get<ExamResultDefinition[]>(
      `${this.apiUrl}/${this.slug}/${encodeURIComponent(examTypeCode)}/result-definitions`,
    );
  }
}

import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/config/api-url';
import { Observable } from 'rxjs';
import { ExamType } from '../models/exam-type';
import { ExamResultDefinition } from '../models/exam-result-definition';
import { ExamResultSchema } from '../models/exam-result-schema';

@Service()
export class ExamTypesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = 'exam-types';

  public getAll(): Observable<ExamType[]> {
    return this.http.get<ExamType[]>(`${this.apiUrl}/${this.slug}`);
  }

  public getActive(): Observable<ExamType[]> {
    return this.http.get<ExamType[]>(`${this.apiUrl}/${this.slug}`, {
      params: { active: true },
    });
  }

  public getActiveResultSchemas(examTypeCode: string): Observable<ExamResultSchema[]> {
    return this.http.get<ExamResultSchema[]>(
      `${this.apiUrl}/${this.slug}/${encodeURIComponent(examTypeCode)}/result-schemas`,
      { params: { active: true } },
    );
  }

  public getActiveSchemaResultDefinitions(
    examTypeCode: string,
    schemaCode: string,
  ): Observable<ExamResultDefinition[]> {
    return this.http.get<ExamResultDefinition[]>(
      `${this.apiUrl}/${this.slug}/${encodeURIComponent(examTypeCode)}/result-schemas/${encodeURIComponent(schemaCode)}/result-definitions`,
      { params: { active: true } },
    );
  }

  public getResultDefinitions(examTypeCode: string): Observable<ExamResultDefinition[]> {
    return this.http.get<ExamResultDefinition[]>(
      `${this.apiUrl}/${this.slug}/${encodeURIComponent(examTypeCode)}/result-definitions`,
    );
  }
}

import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/config/api-url';
import { CreateExamRecordRequest } from '../models/requests/create-exam-record-request';
import { Observable } from 'rxjs';
import { ExamRecord } from '../models/exam-record';
import { UpdateExamRecordRequest } from '../models/requests/update-exam-record-request';
import { ExamRecordFiltersRequest } from '../models/requests/exam-record-filters-request';

@Service()
export class ExamRecordsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = 'exam-records';

  public create(request: CreateExamRecordRequest): Observable<ExamRecord> {
    return this.http.post<ExamRecord>(`${this.apiUrl}/${this.slug}`, request);
  }

  public getAll(filters?: ExamRecordFiltersRequest): Observable<ExamRecord[]> {
    return this.http.get<ExamRecord[]>(`${this.apiUrl}/${this.slug}`, {
      params: {
        ...(filters?.type && { type: filters.type }),
        ...(filters?.date && { date: filters.date }),
        ...(filters?.result !== undefined && { result: filters.result.toString() }),
        ...(filters?.page !== undefined && {
          page: filters.page.toString(),
        }),
        ...(filters?.size !== undefined && {
          size: filters.size.toString(),
        }),
        ...(filters?.sortBy &&
          filters?.sortDirection && { sort: `${filters.sortBy},${filters.sortDirection}` }),
      },
    });
  }

  public getById(id: string): Observable<ExamRecord> {
    return this.http.get<ExamRecord>(`${this.apiUrl}/${this.slug}/${id}`);
  }

  public updateById(id: string, request: UpdateExamRecordRequest): Observable<ExamRecord> {
    return this.http.put<ExamRecord>(`${this.apiUrl}/${this.slug}/${id}`, request);
  }

  public deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${this.slug}/${id}`);
  }
}

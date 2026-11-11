import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/config/api-url';
import { Observable } from 'rxjs';
import { ExamReminder } from '../models/exam-reminder';
import { CreateExamReminderRequest } from '../models/requests/create-exam-reminder-request';
import { UpdateExamReminderRequest } from '../models/requests/update-exam-reminder-request';

@Service()
export class ExamRemindersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = 'exam-reminders';

  public getAll(): Observable<ExamReminder[]> {
    return this.http.get<ExamReminder[]>(`${this.apiUrl}/${this.slug}`);
  }

  public create(request: CreateExamReminderRequest): Observable<ExamReminder> {
    return this.http.post<ExamReminder>(`${this.apiUrl}/${this.slug}`, request);
  }

  public updateById(id: string, request: UpdateExamReminderRequest): Observable<ExamReminder> {
    return this.http.put<ExamReminder>(`${this.apiUrl}/${this.slug}/${id}`, request);
  }

  public deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${this.slug}/${id}`);
  }
}

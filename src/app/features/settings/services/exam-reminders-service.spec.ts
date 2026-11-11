import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../core/config/api-url';
import { ExamReminder } from '../models/exam-reminder';
import { CreateExamReminderRequest } from '../models/requests/create-exam-reminder-request';
import { UpdateExamReminderRequest } from '../models/requests/update-exam-reminder-request';
import { ExamRemindersService } from './exam-reminders-service';

describe('ExamRemindersService', () => {
  let service: ExamRemindersService;
  let http: HttpTestingController;
  const url = `${API_URL}/exam-reminders`;
  const reminder: ExamReminder = {
    id: 'reminder-panel',
    examType: { code: 'PANEL', name: 'Backend panel' },
    enabled: true,
    intervalValue: 3,
    intervalUnit: 'MONTH',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExamRemindersService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists reminders without user IDs or query parameters', () => {
    let response: ExamReminder[] | undefined;
    service.getAll().subscribe((value) => {
      response = value;
    });
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([reminder]);
    expect(response).toEqual([reminder]);
  });

  it('creates using business code and interval only, returning the enabled resource', () => {
    const body: CreateExamReminderRequest = {
      examTypeCode: 'PANEL',
      intervalValue: 3,
      intervalUnit: 'MONTH',
    };
    let response: ExamReminder | undefined;
    service.create(body).subscribe((value) => {
      response = value;
    });
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(reminder);
    expect(response).toEqual(reminder);
  });

  it('updates using the URL ID and only enabled and interval fields', () => {
    const body: UpdateExamReminderRequest = {
      enabled: false,
      intervalValue: 2,
      intervalUnit: 'YEAR',
    };
    const updated = { ...reminder, ...body };
    let response: ExamReminder | undefined;
    service.updateById(reminder.id, body).subscribe((value) => {
      response = value;
    });
    const request = http.expectOne(`${url}/${reminder.id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush(updated);
    expect(response).toEqual(updated);
  });

  it('deletes using only the URL ID', () => {
    service.deleteById(reminder.id).subscribe();
    const request = http.expectOne(`${url}/${reminder.id}`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    expect(request.request.params.keys()).toEqual([]);
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});

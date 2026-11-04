import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../core/config/api-url';
import { Settings } from '../models/settings';
import { SettingsService } from './settings-service';

describe('SettingsService', () => {
  let service: SettingsService;
  let http: HttpTestingController;
  const settings: Settings = {
    defaultTrendsExam: 'GLU',
    language: 'en',
    hba1cReminderEnabled: false,
    hba1cReminderInterval: 3,
    glucoseReminderEnabled: true,
    glucoseReminderInterval: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads settings from the existing session-based endpoint without a user ID', () => {
    service.get().subscribe((response) => expect(response).toEqual(settings));
    const request = http.expectOne(`${API_URL}/settings`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(settings);
  });

  it('updates the existing contract and returns settings without adding a user ID', () => {
    service.update(settings).subscribe((response) => expect(response).toEqual(settings));
    const request = http.expectOne(`${API_URL}/settings`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(settings);
    expect(request.request.params.keys()).toEqual([]);
    request.flush(settings);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import { ProfileService } from './profile-service';

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps the existing GET contract', () => {
    service.getById('user-id').subscribe();
    const request = http.expectOne(`${API_URL}/profile/user-id`);
    expect(request.request.method).toBe('GET');
    request.flush({ fullName: 'Name', email: 'user@example.com', createdAt: '2026-10-15' });
  });

  it('sends only UpdateProfileRequest and returns the updated Profile', () => {
    const updated = {
      fullName: 'Updated Name',
      email: 'user@example.com',
      createdAt: '2026-10-15',
    };
    service
      .updateById('user-id', { fullName: 'Updated Name' })
      .subscribe((profile) => expect(profile).toEqual(updated));
    const request = http.expectOne(`${API_URL}/profile/user-id`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ fullName: 'Updated Name' });
    request.flush(updated);
  });
});

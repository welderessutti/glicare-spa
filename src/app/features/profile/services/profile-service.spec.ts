import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import { ProfileService } from './profile-service';
import { Profile } from '../models/profile';
import { UpdateProfileRequest } from '../models/requests/update-profile-request';

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

  it('loads the current user profile without a user ID in the URL', () => {
    const profile: Profile = {
      fullName: 'Name',
      email: 'user@example.com',
      createdAt: '2026-10-15',
    };
    service.get().subscribe((response) => expect(response).toEqual(profile));
    const request = http.expectOne(`${API_URL}/profile`);
    expect(request.request.method).toBe('GET');
    request.flush(profile);
  });

  it('sends only UpdateProfileRequest and returns the updated Profile', () => {
    const updated: Profile = {
      fullName: 'Updated Name',
      email: 'user@example.com',
      createdAt: '2026-10-15',
    };
    const body: UpdateProfileRequest = { fullName: 'Updated Name' };
    service.update(body).subscribe((profile) => expect(profile).toEqual(updated));
    const request = http.expectOne(`${API_URL}/profile`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ fullName: 'Updated Name' });
    request.flush(updated);
  });
});

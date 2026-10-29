import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import { authInterceptor } from '../../../core/interceptors/auth/auth-interceptor';
import { AuthService } from './auth-service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('changes password using the existing cookie authentication', () => {
    const body = { currentPassword: 'current-password', newPassword: 'new-password' };
    service.changePassword(body).subscribe();
    const request = http.expectOne(`${API_URL}/auth/change-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.withCredentials).toBe(true);
    request.flush(null);
  });
});

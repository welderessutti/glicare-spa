import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegisterRequest } from '../models/requests/register-request';
import { LoginResponse } from '../models/responses/login-response';
import { LoginRequest } from '../models/requests/login-request';
import { ForgotPasswordRequest } from '../models/requests/forgot-password-request';
import { ResetPasswordRequest } from '../models/requests/reset-password-request';
import { API_URL } from '../../../shared/api-url';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = '/auth';

  public register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}${this.slug}/register`, request);
  }

  public login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}${this.slug}/login`, request);
  }

  public forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}${this.slug}/forgot-password`, request);
  }

  public resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}${this.slug}/reset-password`, request);
  }

  public verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}${this.slug}/verify-email`, { token });
  }
}

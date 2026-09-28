import { computed, inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegisterRequest } from '../models/requests/register-request';
import { LoginResponse } from '../models/responses/login-response';
import { LoginRequest } from '../models/requests/login-request';
import { ForgotPasswordRequest } from '../models/requests/forgot-password-request';
import { ResetPasswordRequest } from '../models/requests/reset-password-request';
import { AuthenticatedUser } from '../models/authenticated-user';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/api/auth';
  private readonly _user = signal<AuthenticatedUser | null>(null);
  private readonly _status = signal<AuthStatus>('checking');
  public readonly user = this._user.asReadonly();
  public readonly status = this._status.asReadonly();
  public readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  public getCurrentUser(): Observable<AuthenticatedUser> {
    return this.http.get<AuthenticatedUser>(`${this.apiUrl}/me`);
  }

  public restoreSession(): void {
    this._status.set('checking');
    console.log(this.status());

    this.getCurrentUser().subscribe({
      next: (user) => {
        this._user.set(user);
        this._status.set('authenticated');
        console.log(this.user()?.fullName + this.status());
      },
      error: () => {
        this._user.set(null);
        this._status.set('unauthenticated');
        console.log(this.user()?.fullName + this.status());
      },
    });
  }

  public register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/register`, request);
  }

  public login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request);
  }

  public forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, request);
  }

  public resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, request);
  }

  public verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/verify-email`, { token });
  }
}

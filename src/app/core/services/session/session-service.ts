import { computed, inject, Service, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { AuthenticatedUser } from '../../../features/auth/models/authenticated-user';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../shared/api-url';
import { SessionStatus } from '../../models/session-status';

@Service()
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = '/session';
  private readonly _user = signal<AuthenticatedUser | null>(null);
  private readonly _status = signal<SessionStatus>('checking');
  public readonly user = this._user.asReadonly();
  public readonly status = this._status.asReadonly();
  public readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  public getCurrentUser(): Observable<AuthenticatedUser> {
    return this.http.get<AuthenticatedUser>(`${this.apiUrl}${this.slug}/me`);
  }

  public restoreSession(): Observable<void> {
    this._status.set('checking');
    console.log('user:', this.user());
    console.log('status:', this.status());

    return this.getCurrentUser().pipe(
      tap((user) => {
        this._user.set(user);
        this._status.set('authenticated');
        console.log('user:', this.user());
        console.log('status:', this.status());
      }),
      map(() => void 0),
      catchError(() => {
        this._user.set(null);
        this._status.set('unauthenticated');
        console.log('user:', this.user());
        console.log('status:', this.status());
        return of(void 0);
      }),
    );
  }
}

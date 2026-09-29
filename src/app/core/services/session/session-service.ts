import { computed, inject, Service, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { SessionAuthenticatedUser } from '../../../shared/models/session-authenticated-user';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../shared/api-url';
import { SessionStatus } from '../../models/session-status';

@Service()
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = '/session';
  private readonly _user = signal<SessionAuthenticatedUser | null>(null);
  private readonly _status = signal<SessionStatus>('checking');
  public readonly user = this._user.asReadonly();
  public readonly status = this._status.asReadonly();
  public readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  private endSession(): void {
    this._user.set(null);
    this._status.set('unauthenticated');
  }

  public startSession(user: SessionAuthenticatedUser): void {
    this._user.set(user);
    this._status.set('authenticated');
  }

  public getCurrentSessionAuthenticatedUser(): Observable<SessionAuthenticatedUser> {
    return this.http.get<SessionAuthenticatedUser>(`${this.apiUrl}${this.slug}/me`);
  }

  public restoreSession(): Observable<void> {
    this._status.set('checking');
    console.log('user:', this.user());
    console.log('status:', this.status());

    return this.getCurrentSessionAuthenticatedUser().pipe(
      tap((user) => {
        this.startSession(user);
        console.log('user:', this.user());
        console.log('status:', this.status());
      }),
      map(() => void 0),
      catchError(() => {
        this.endSession();
        console.log('user:', this.user());
        console.log('status:', this.status());
        return of(void 0);
      }),
    );
  }

  public logout(): Observable<void> {
    console.log('user:', this.user());
    console.log('status:', this.status());

    return this.http.post<void>(`${this.apiUrl}${this.slug}/logout`, {}).pipe(
      tap(() => {
        this.endSession();
        console.log('user:', this.user());
        console.log('status:', this.status());
      }),
    );
  }
}

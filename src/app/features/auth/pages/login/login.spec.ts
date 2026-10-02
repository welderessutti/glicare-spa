import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';
import { Login } from './login';
import { AuthService } from '../../services/auth-service';
import { SessionService } from '../../../../core/services/session/session-service';
import { LoginRequest } from '../../models/requests/login-request';
import { SessionAuthenticatedUser } from '../../../../core/models/session-authenticated-user';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let page: HTMLElement;
  let response: Subject<SessionAuthenticatedUser>;
  const login = vi.fn<(request: LoginRequest) => Observable<SessionAuthenticatedUser>>();
  const startSession = vi.fn<(user: SessionAuthenticatedUser) => void>();

  function input(id: string): HTMLInputElement {
    const control = page.querySelector<HTMLInputElement>(id);
    if (!control) {
      throw new Error(`Missing input: ${id}`);
    }
    return control;
  }

  async function enterCredentials(
    email = 'you@example.com',
    password = 'test-password',
  ): Promise<void> {
    input('#login-email').value = email;
    input('#login-email').dispatchEvent(new Event('input'));
    input('#login-password').value = password;
    input('#login-password').dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  function submitForm(): void {
    page
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  beforeEach(async () => {
    response = new Subject<SessionAuthenticatedUser>();
    login.mockReset().mockReturnValue(response);
    startSession.mockReset();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login } },
        { provide: SessionService, useValue: { startSession } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => response.complete());

  it('starts without validation errors and exposes the recovery and registration routes', () => {
    expect(page.querySelector('h1')?.textContent).toContain('Welcome back');
    expect(input('#login-email').getAttribute('aria-invalid')).toBe('false');
    expect(page.querySelector('[href="/auth/forgot-password"]')).not.toBeNull();
    expect(page.querySelector('[href="/auth/register"]')).not.toBeNull();
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it('reveals and hides the password without changing its value or submitting', async () => {
    await enterCredentials();
    const toggle = page.querySelector<HTMLButtonElement>('[aria-controls="login-password"]');
    expect(input('#login-password').type).toBe('password');

    toggle?.click();
    await fixture.whenStable();
    expect(input('#login-password').type).toBe('text');
    expect(input('#login-password').value).toBe('test-password');
    expect(toggle?.getAttribute('aria-label')).toBe('Hide password');

    toggle?.click();
    await fixture.whenStable();
    expect(input('#login-password').type).toBe('password');
    expect(toggle?.getAttribute('aria-label')).toBe('Show password');
    expect(login).not.toHaveBeenCalled();
  });

  it('focuses the first invalid field and associates the visible errors without calling login', async () => {
    submitForm();
    await fixture.whenStable();

    expect(document.activeElement).toBe(input('#login-email'));
    expect(input('#login-email').getAttribute('aria-invalid')).toBe('true');
    expect(input('#login-email').getAttribute('aria-describedby')).toBe('login-email-error');
    expect(page.querySelector('#login-email-error')?.textContent).toContain(
      'Enter your email address.',
    );
    expect(input('#login-password').getAttribute('aria-describedby')).toBe('login-password-error');
    expect(login).not.toHaveBeenCalled();
  });

  it('clears field errors as the user corrects the values', async () => {
    await enterCredentials('invalid', '');
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#login-email-error')?.textContent).toContain(
      'Enter a valid email address.',
    );

    await enterCredentials();
    expect(input('#login-email').getAttribute('aria-invalid')).toBe('false');
    expect(input('#login-email').hasAttribute('aria-describedby')).toBe(false);
    expect(page.querySelector('#login-email-error')).toBeNull();
    expect(page.querySelector('#login-password-error')).toBeNull();
  });

  it('announces loading, blocks editing and duplicate submissions, and recovers after an error', async () => {
    await enterCredentials();
    submitForm();
    await fixture.whenStable();

    expect(login).toHaveBeenCalledExactlyOnceWith({
      email: 'you@example.com',
      password: 'test-password',
    });
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(input('#login-email').matches(':disabled')).toBe(true);
    expect(input('#login-password').matches(':disabled')).toBe(true);
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Signing in. Please wait.',
    );

    submitForm();
    await fixture.whenStable();
    expect(login).toHaveBeenCalledTimes(1);

    response.error(new HttpErrorResponse({ status: 401 }));
    await Promise.resolve();
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Invalid email or password',
    );
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
    expect(input('#login-email').matches(':disabled')).toBe(false);
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    expect(input('#login-password').value).toBe('test-password');
    expect(startSession).not.toHaveBeenCalled();
  });

  it('keeps the existing session and dashboard navigation on successful login', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const user: SessionAuthenticatedUser = {
      id: 'test-user',
      fullName: 'Test User',
      email: 'you@example.com',
    };

    await enterCredentials();
    submitForm();
    await fixture.whenStable();
    response.next(user);
    await fixture.whenStable();

    expect(startSession).toHaveBeenCalledExactlyOnceWith(user);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/dashboard']);
  });

  it('shows password-reset confirmation only while the existing query parameter is true', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?passwordReset=true');
    await fixture.whenStable();
    expect(page.textContent).toContain('Your password has been updated.');

    await router.navigateByUrl('/?passwordReset=false');
    await fixture.whenStable();
    expect(page.textContent).not.toContain('Your password has been updated.');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';
import { Register } from './register';
import { AuthService } from '../../services/auth-service';
import { RegisterRequest } from '../../models/requests/register-request';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let page: HTMLElement;
  let response: Subject<void>;
  const register = vi.fn<(request: RegisterRequest) => Observable<void>>();

  function input(id: string): HTMLInputElement {
    const control = page.querySelector<HTMLInputElement>(id);
    if (!control) {
      throw new Error(`Missing input: ${id}`);
    }
    return control;
  }

  async function enterDetails(overrides: Partial<RegisterRequest> = {}): Promise<void> {
    const details: RegisterRequest = {
      fullName: 'Test User',
      email: 'you@example.com',
      password: 'test-password',
      confirmPassword: 'test-password',
      ...overrides,
    };
    const values = {
      '#register-full-name': details.fullName,
      '#register-email': details.email,
      '#register-password': details.password,
      '#register-confirm-password': details.confirmPassword,
    };
    for (const [id, value] of Object.entries(values)) {
      input(id).value = value;
      input(id).dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
  }

  function submitForm(): void {
    page
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  beforeEach(async () => {
    response = new Subject<void>();
    register.mockReset().mockReturnValue(response);
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => response.complete());

  it('starts without validation errors, describes password requirements and links to sign in', () => {
    expect(page.querySelector('h1')?.textContent).toContain('Create your account');
    expect(page.querySelector('[href="/auth/login"]')).not.toBeNull();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(input('#register-password').getAttribute('aria-describedby')).toBe(
      'register-password-hint',
    );
    expect(page.querySelector('#register-password-hint')?.textContent).toContain(
      'Use 8 to 64 characters.',
    );
    for (const control of page.querySelectorAll('input')) {
      expect(control.getAttribute('aria-invalid')).toBe('false');
    }
  });

  it('toggles each password independently without changing values or submitting', async () => {
    await enterDetails();
    const passwordToggle = page.querySelector<HTMLButtonElement>(
      '[aria-controls="register-password"]',
    );
    const confirmToggle = page.querySelector<HTMLButtonElement>(
      '[aria-controls="register-confirm-password"]',
    );
    passwordToggle?.click();
    await fixture.whenStable();
    expect(input('#register-password').type).toBe('text');
    expect(input('#register-confirm-password').type).toBe('password');
    expect(passwordToggle?.getAttribute('aria-label')).toBe('Hide password');
    confirmToggle?.click();
    await fixture.whenStable();
    expect(input('#register-confirm-password').type).toBe('text');
    expect(confirmToggle?.getAttribute('aria-label')).toBe('Hide password confirmation');
    passwordToggle?.click();
    confirmToggle?.click();
    await fixture.whenStable();
    expect(input('#register-password').type).toBe('password');
    expect(input('#register-confirm-password').type).toBe('password');
    expect(input('#register-password').value).toBe('test-password');
    expect(input('#register-confirm-password').value).toBe('test-password');
    expect(register).not.toHaveBeenCalled();
  });

  it('focuses the first invalid field and associates required errors without calling register', async () => {
    submitForm();
    await fixture.whenStable();
    expect(document.activeElement).toBe(input('#register-full-name'));
    expect(input('#register-full-name').getAttribute('aria-describedby')).toBe(
      'register-full-name-error',
    );
    expect(page.querySelector('#register-full-name-error')?.textContent).toContain(
      'Enter your full name.',
    );
    expect(input('#register-password').getAttribute('aria-describedby')).toBe(
      'register-password-hint register-password-error',
    );
    for (const control of page.querySelectorAll('input')) {
      expect(control.getAttribute('aria-invalid')).toBe('true');
    }
    expect(register).not.toHaveBeenCalled();
  });

  it('preserves email and password length rules and clears errors after correction', async () => {
    await enterDetails({ email: 'invalid', password: 'short', confirmPassword: 'short' });
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#register-email-error')?.textContent).toContain(
      'Enter a valid email address.',
    );
    expect(page.querySelector('#register-password-error')?.textContent).toContain(
      'Use at least 8 characters.',
    );
    await enterDetails({ password: 'x'.repeat(65), confirmPassword: 'x'.repeat(65) });
    expect(page.querySelector('#register-password-error')?.textContent).toContain(
      'Use no more than 64 characters.',
    );
    await enterDetails();
    expect(page.querySelector('#register-email-error')).toBeNull();
    expect(page.querySelector('#register-password-error')).toBeNull();
    expect(input('#register-password').getAttribute('aria-describedby')).toBe(
      'register-password-hint',
    );
    expect(register).not.toHaveBeenCalled();
  });

  it('shows only the required message for an empty password confirmation', async () => {
    await enterDetails({ confirmPassword: '' });
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#register-confirm-password-error')?.textContent).toContain(
      'Confirm your password.',
    );
    expect(page.querySelector('#register-confirm-password-error')?.textContent).not.toContain(
      "Passwords don't match.",
    );
    expect(register).not.toHaveBeenCalled();
  });

  it('revalidates confirmation when either password changes', async () => {
    await enterDetails({ confirmPassword: 'different-password' });
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#register-confirm-password-error')?.textContent).toContain(
      "Passwords don't match.",
    );
    expect(document.activeElement).toBe(input('#register-confirm-password'));
    await enterDetails({ password: 'different-password', confirmPassword: 'different-password' });
    expect(page.querySelector('#register-confirm-password-error')).toBeNull();
    await enterDetails({ password: 'different-password' });
    expect(page.querySelector('#register-confirm-password-error')?.textContent).toContain(
      "Passwords don't match.",
    );
    await enterDetails();
    expect(input('#register-confirm-password').getAttribute('aria-invalid')).toBe('false');
    expect(register).not.toHaveBeenCalled();
  });

  it('announces loading, prevents duplicate submissions and recovers after an error', async () => {
    await enterDetails();
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Creating your account. Please wait.',
    );
    for (const control of page.querySelectorAll('fieldset input, fieldset button')) {
      expect(control.matches(':disabled')).toBe(true);
    }
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    submitForm();
    await fixture.whenStable();
    expect(register).toHaveBeenCalledTimes(1);
    response.error(new HttpErrorResponse({ status: 409 }));
    await Promise.resolve();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'An account with this email already exists.',
    );
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
    expect(input('#register-full-name').matches(':disabled')).toBe(false);
    expect(input('#register-confirm-password').value).toBe('test-password');
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    response = new Subject<void>();
    register.mockReturnValue(response);
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(register).toHaveBeenCalledTimes(2);
  });

  it.each([
    [429, 'Too many attempts. Please try again later.'],
    [500, 'Unable to create your account right now.'],
  ])('preserves safe feedback for HTTP %s', async (status, message) => {
    await enterDetails();
    submitForm();
    await fixture.whenStable();
    response.error(new HttpErrorResponse({ status, error: 'Internal server details' }));
    await Promise.resolve();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(page.textContent).not.toContain('Internal server details');
  });

  it('preserves the registration payload and navigates to check-email after success', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await enterDetails();
    submitForm();
    await fixture.whenStable();
    expect(register).toHaveBeenCalledExactlyOnceWith({
      fullName: 'Test User',
      email: 'you@example.com',
      password: 'test-password',
      confirmPassword: 'test-password',
    });
    response.next();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/auth/check-email']);
  });
});

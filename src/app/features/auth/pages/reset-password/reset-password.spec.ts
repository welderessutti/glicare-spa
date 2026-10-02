import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ResetPassword } from './reset-password';
import { AuthService } from '../../services/auth-service';
import { ResetPasswordRequest } from '../../models/requests/reset-password-request';

describe('ResetPassword', () => {
  let fixture: ComponentFixture<ResetPassword>;
  let page: HTMLElement;
  let response: Subject<void>;
  const resetPassword = vi.fn<(request: ResetPasswordRequest) => Observable<void>>();

  function input(id: string): HTMLInputElement {
    const control = page.querySelector<HTMLInputElement>(id);
    if (!control) {
      throw new Error(`Missing input: ${id}`);
    }
    return control;
  }

  async function enterPasswords(
    password = 'test-password',
    confirmPassword = password,
  ): Promise<void> {
    input('#reset-password').value = password;
    input('#reset-password').dispatchEvent(new Event('input'));
    input('#reset-confirm-password').value = confirmPassword;
    input('#reset-confirm-password').dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  function submitForm(): void {
    page
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  beforeEach(async () => {
    response = new Subject<void>();
    resetPassword.mockReset().mockReturnValue(response);
    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [provideRouter([]), { provide: AuthService, useValue: { resetPassword } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPassword);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => response.complete());

  it('starts without errors, describes password requirements and offers a return to sign in', () => {
    expect(page.querySelector('h1')?.textContent).toContain('Set a new password');
    expect(page.querySelector('[href="/auth/login"]')).not.toBeNull();
    expect(page.querySelector('[href="/auth/forgot-password"]')).toBeNull();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(input('#reset-password').getAttribute('aria-describedby')).toBe('reset-password-hint');
    expect(page.querySelector('#reset-password-hint')?.textContent).toContain(
      'Use 8 to 64 characters.',
    );
    expect(input('#reset-password').getAttribute('aria-invalid')).toBe('false');
    expect(input('#reset-confirm-password').getAttribute('aria-invalid')).toBe('false');
  });

  it('toggles each password independently without changing its value or submitting', async () => {
    await enterPasswords();
    const passwordToggle = page.querySelector<HTMLButtonElement>(
      '[aria-controls="reset-password"]',
    );
    const confirmToggle = page.querySelector<HTMLButtonElement>(
      '[aria-controls="reset-confirm-password"]',
    );
    passwordToggle?.click();
    await fixture.whenStable();
    expect(input('#reset-password').type).toBe('text');
    expect(input('#reset-confirm-password').type).toBe('password');
    expect(passwordToggle?.getAttribute('aria-label')).toBe('Hide new password');
    confirmToggle?.click();
    await fixture.whenStable();
    expect(input('#reset-confirm-password').type).toBe('text');
    expect(confirmToggle?.getAttribute('aria-label')).toBe('Hide password confirmation');
    passwordToggle?.click();
    confirmToggle?.click();
    await fixture.whenStable();
    expect(input('#reset-password').type).toBe('password');
    expect(input('#reset-confirm-password').type).toBe('password');
    expect(input('#reset-password').value).toBe('test-password');
    expect(input('#reset-confirm-password').value).toBe('test-password');
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('focuses the first invalid field and associates required errors without requesting a reset', async () => {
    submitForm();
    await fixture.whenStable();
    expect(document.activeElement).toBe(input('#reset-password'));
    expect(input('#reset-password').getAttribute('aria-invalid')).toBe('true');
    expect(input('#reset-password').getAttribute('aria-describedby')).toBe(
      'reset-password-hint reset-password-error',
    );
    expect(page.querySelector('#reset-password-error')?.textContent).toContain(
      'Enter your new password.',
    );
    expect(input('#reset-confirm-password').getAttribute('aria-describedby')).toBe(
      'reset-confirm-password-error',
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('preserves password length rules and clears errors at the allowed boundaries', async () => {
    await enterPasswords('x'.repeat(7));
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#reset-password-error')?.textContent).toContain(
      'Use at least 8 characters.',
    );
    await enterPasswords('x'.repeat(65));
    expect(page.querySelector('#reset-password-error')?.textContent).toContain(
      'Use no more than 64 characters.',
    );
    await enterPasswords('x'.repeat(8));
    expect(page.querySelector('#reset-password-error')).toBeNull();
    await enterPasswords('x'.repeat(64));
    expect(input('#reset-password').getAttribute('aria-invalid')).toBe('false');
    expect(input('#reset-password').getAttribute('aria-describedby')).toBe('reset-password-hint');
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('shows only the required message when confirmation is empty', async () => {
    await enterPasswords('test-password', '');
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#reset-confirm-password-error')?.textContent).toContain(
      'Confirm your new password.',
    );
    expect(page.querySelector('#reset-confirm-password-error')?.textContent).not.toContain(
      "Passwords don't match.",
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('revalidates confirmation when either password changes', async () => {
    await enterPasswords('test-password', 'different-password');
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#reset-confirm-password-error')?.textContent).toContain(
      "Passwords don't match.",
    );
    expect(document.activeElement).toBe(input('#reset-confirm-password'));
    await enterPasswords('different-password');
    expect(page.querySelector('#reset-confirm-password-error')).toBeNull();
    await enterPasswords('test-password', 'different-password');
    expect(page.querySelector('#reset-confirm-password-error')?.textContent).toContain(
      "Passwords don't match.",
    );
    await enterPasswords();
    expect(input('#reset-confirm-password').getAttribute('aria-invalid')).toBe('false');
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('announces loading, prevents duplicate submissions and restores editing after an error', async () => {
    await enterPasswords();
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(page.querySelector('#reset-password-status')?.textContent).toContain(
      'Saving your new password. Please wait.',
    );
    for (const control of page.querySelectorAll('fieldset input, fieldset button')) {
      expect(control.matches(':disabled')).toBe(true);
    }
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    submitForm();
    await fixture.whenStable();
    expect(resetPassword).toHaveBeenCalledTimes(1);
    response.error(new HttpErrorResponse({ status: 429 }));
    await Promise.resolve();
    await fixture.whenStable();
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
    expect(input('#reset-password').matches(':disabled')).toBe(false);
    expect(input('#reset-confirm-password').value).toBe('test-password');
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it.each([
    [400, 'The password reset link is invalid.'],
    [410, 'This password reset link has expired.'],
  ])(
    'offers a new reset link after HTTP %s and clears the old error on retry',
    async (status, message) => {
      await enterPasswords();
      submitForm();
      await fixture.whenStable();
      response.error(new HttpErrorResponse({ status }));
      await Promise.resolve();
      await fixture.whenStable();
      expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(page.querySelector('[href="/auth/forgot-password"]')?.textContent).toContain(
        'Request a new reset link',
      );
      response = new Subject<void>();
      resetPassword.mockReturnValue(response);
      submitForm();
      await fixture.whenStable();
      expect(page.querySelector('[role="alert"]')).toBeNull();
      expect(page.querySelector('[href="/auth/forgot-password"]')).toBeNull();
      expect(resetPassword).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    [429, 'Too many attempts. Please try again later.'],
    [500, 'Unable to reset your password right now.'],
  ])(
    'preserves safe feedback for HTTP %s without suggesting the link is invalid',
    async (status, message) => {
      await enterPasswords();
      submitForm();
      await fixture.whenStable();
      response.error(new HttpErrorResponse({ status, error: 'Internal server details' }));
      await Promise.resolve();
      await fixture.whenStable();
      expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(page.textContent).not.toContain('Internal server details');
      expect(page.querySelector('[href="/auth/forgot-password"]')).toBeNull();
    },
  );

  it('preserves the request and returns to sign in with password-reset confirmation after success', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await enterPasswords();
    submitForm();
    await fixture.whenStable();
    expect(resetPassword).toHaveBeenCalledExactlyOnceWith({
      password: 'test-password',
      confirmPassword: 'test-password',
    });
    response.next();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/auth/login'], {
      queryParams: { passwordReset: true },
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ForgotPassword } from './forgot-password';
import { AuthService } from '../../services/auth-service';
import { ForgotPasswordRequest } from '../../models/requests/forgot-password-request';

describe('ForgotPassword', () => {
  let fixture: ComponentFixture<ForgotPassword>;
  let page: HTMLElement;
  let response: Subject<void>;
  const forgotPassword = vi.fn<(request: ForgotPasswordRequest) => Observable<void>>();

  function emailInput(): HTMLInputElement {
    const control = page.querySelector<HTMLInputElement>('#forgot-password-email');
    if (!control) {
      throw new Error('Missing email input');
    }
    return control;
  }

  async function enterEmail(email = 'you@example.com'): Promise<void> {
    emailInput().value = email;
    emailInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  function submitForm(): void {
    page
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  beforeEach(async () => {
    response = new Subject<void>();
    forgotPassword.mockReset().mockReturnValue(response);
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), { provide: AuthService, useValue: { forgotPassword } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => response.complete());

  it('starts without errors or success feedback and offers a return to sign in', () => {
    expect(page.querySelector('h1')?.textContent).toContain('Forgot your password?');
    expect(page.querySelector('[href="/auth/login"]')?.textContent).toContain('Back to sign in');
    expect(emailInput().getAttribute('aria-invalid')).toBe('false');
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.querySelector('#forgot-password-success')?.textContent?.trim()).toBe('');
    expect(page.querySelector('#forgot-password-success')?.getAttribute('role')).toBe('status');
  });

  it('focuses an empty email and associates the required error without requesting a link', async () => {
    submitForm();
    await fixture.whenStable();
    expect(document.activeElement).toBe(emailInput());
    expect(emailInput().getAttribute('aria-invalid')).toBe('true');
    expect(emailInput().getAttribute('aria-describedby')).toBe('forgot-password-email-error');
    expect(page.querySelector('#forgot-password-email-error')?.textContent).toContain(
      'Enter your email address.',
    );
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('rejects an invalid email and clears its visible error as it is corrected', async () => {
    await enterEmail('invalid');
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#forgot-password-email-error')?.textContent).toContain(
      'Enter a valid email address.',
    );
    await enterEmail();
    expect(emailInput().getAttribute('aria-invalid')).toBe('false');
    expect(emailInput().hasAttribute('aria-describedby')).toBe(false);
    expect(page.querySelector('#forgot-password-email-error')).toBeNull();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('announces loading, blocks editing and prevents duplicate requests', async () => {
    await enterEmail();
    submitForm();
    await fixture.whenStable();
    expect(forgotPassword).toHaveBeenCalledExactlyOnceWith({ email: 'you@example.com' });
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(emailInput().matches(':disabled')).toBe(true);
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(page.querySelector('#forgot-password-status')?.textContent).toContain(
      'Sending your reset link. Please wait.',
    );
    submitForm();
    await fixture.whenStable();
    expect(forgotPassword).toHaveBeenCalledTimes(1);
  });

  it('announces generic success and allows another request without clearing the email', async () => {
    await enterEmail();
    submitForm();
    await fixture.whenStable();
    response.next();
    await Promise.resolve();
    await fixture.whenStable();
    expect(page.querySelector('#forgot-password-success')?.textContent).toContain(
      'Check your email',
    );
    expect(page.querySelector('#forgot-password-success')?.textContent).toContain(
      'If an account exists for this email, recovery instructions have been sent.',
    );
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
    expect(emailInput().matches(':disabled')).toBe(false);
    expect(emailInput().value).toBe('you@example.com');
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    expect(page.querySelector('#forgot-password-status')?.textContent?.trim()).toBe('');
  });

  it.each([
    [429, 'Too many requests. Please try again later.'],
    [500, 'Unable to process your request right now.'],
  ])('shows safe feedback and restores editing after HTTP %s', async (status, message) => {
    await enterEmail();
    submitForm();
    await fixture.whenStable();
    response.error(new HttpErrorResponse({ status, error: 'Internal server details' }));
    await Promise.resolve();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(page.textContent).not.toContain('Internal server details');
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
    expect(emailInput().matches(':disabled')).toBe(false);
    expect(emailInput().value).toBe('you@example.com');
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it('clears previous feedback while resending and keeps success and error mutually exclusive', async () => {
    await enterEmail();
    submitForm();
    await fixture.whenStable();
    response.next();
    await Promise.resolve();
    await fixture.whenStable();

    response = new Subject<void>();
    forgotPassword.mockReturnValue(response);
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('#forgot-password-success')?.textContent?.trim()).toBe('');
    response.error(new HttpErrorResponse({ status: 429 }));
    await Promise.resolve();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
    expect(page.querySelector('#forgot-password-success')?.textContent?.trim()).toBe('');

    response = new Subject<void>();
    forgotPassword.mockReturnValue(response);
    submitForm();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    response.next();
    await Promise.resolve();
    await fixture.whenStable();
    expect(page.querySelector('#forgot-password-success')?.textContent).toContain(
      'Check your email',
    );
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(forgotPassword).toHaveBeenCalledTimes(3);
  });
});

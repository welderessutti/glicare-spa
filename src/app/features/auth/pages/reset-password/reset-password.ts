import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { ResetPasswordRequest } from '../../models/requests/reset-password-request';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { VerifyEmailStatus } from '../../models/verify-email-status';
import { ResetPasswordStatus } from '../../models/reset-password-status';

@Component({
  imports: [FormRoot, FormField, RouterLink],
  selector: 'app-reset-password',
  styleUrl: './reset-password.css',
  templateUrl: './reset-password.html',
})
export class ResetPassword implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly resetPasswordModel = signal<ResetPasswordRequest>({
    password: '',
    confirmPassword: '',
  });
  private token: string | null = null;
  private redirectIntervalId?: ReturnType<typeof setInterval>;
  protected readonly redirectCountdown = signal<number>(0);
  protected readonly resetPasswordStatus = signal<ResetPasswordStatus>('ready');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);
  protected readonly resetLinkUnavailable = signal(false);
  protected readonly passwordInvalid = computed(
    () =>
      this.resetPasswordForm.password().touched() && this.resetPasswordForm.password().invalid(),
  );
  protected readonly confirmPasswordInvalid = computed(
    () =>
      this.resetPasswordForm.confirmPassword().touched() &&
      this.resetPasswordForm.confirmPassword().invalid(),
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.resetPasswordStatus.set('unavailable');
    }
  }

  ngOnDestroy(): void {
    this.clearRedirectCountdown();
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  private clearRedirectCountdown(): void {
    if (this.redirectIntervalId !== undefined) {
      clearInterval(this.redirectIntervalId);
      this.redirectIntervalId = undefined;
    }
  }

  private startRedirectCountdown(): void {
    this.clearRedirectCountdown();
    this.redirectCountdown.set(5);

    this.redirectIntervalId = setInterval(() => {
      const current = this.redirectCountdown();

      if (current <= 1) {
        this.clearRedirectCountdown();

        void this.router.navigate(['/auth/login'], { queryParams: { passwordReset: true } });
        return;
      }

      this.redirectCountdown.set(current - 1);
    }, 1000);
  }

  private handleResetPasswordError(error: HttpErrorResponse): void {
    this.resetLinkUnavailable.set(error.status === 400 || error.status === 410);
    switch (error.status) {
      case 400:
        this.resetPasswordStatus.set('invalid');
        this.errorMessage.set('The password reset link is invalid.');
        break;
      case 410:
        this.resetPasswordStatus.set('expired');
        this.errorMessage.set('This password reset link has expired.');
        break;
      case 429:
        this.resetPasswordStatus.set('error');
        this.errorMessage.set('Too many attempts. Please try again later.');
        break;
      default:
        this.resetPasswordStatus.set('error');
        this.errorMessage.set('Unable to reset your password right now.');
    }
  }

  protected readonly resetPasswordForm = form(
    this.resetPasswordModel,
    (schemaPath) => {
      required(schemaPath.password, { message: 'Enter your new password.' });
      minLength(schemaPath.password, 8, { message: 'Use at least 8 characters.' });
      maxLength(schemaPath.password, 64, { message: 'Use no more than 64 characters.' });
      required(schemaPath.confirmPassword, { message: 'Confirm your new password.' });
      validate(schemaPath.confirmPassword, ({ value, valueOf, stateOf }) => {
        if (!value() || !stateOf(schemaPath.password).touched()) {
          return null;
        }
        if (value() !== valueOf(schemaPath.password)) {
          return {
            kind: 'passwordMismatch',
            message: "Passwords don't match.",
          };
        }
        return null;
      });
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);
          this.resetPasswordStatus.set('ready');
          this.resetLinkUnavailable.set(false);

          try {
            await firstValueFrom(this.authService.resetPassword(field().value()));
            this.resetPasswordStatus.set('success');
            this.startRedirectCountdown();
          } catch (error) {
            const httpError = error as HttpErrorResponse;
            this.handleResetPasswordError(httpError);
          }
        },
        onInvalid: (field) => {
          const firstError = field().errorSummary()[0];
          firstError?.fieldTree().focusBoundControl();
        },
      },
    },
  );
}

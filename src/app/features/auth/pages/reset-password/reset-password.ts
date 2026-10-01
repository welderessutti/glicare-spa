import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { ResetPasswordRequest } from '../../models/requests/reset-password-request';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';

@Component({
  imports: [FormRoot, FormField],
  selector: 'app-reset-password',
  styleUrl: './reset-password.css',
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly resetPasswordModel = signal<ResetPasswordRequest>({
    password: '',
    confirmPassword: '',
  });
  protected readonly errorMessage = signal<string | null>(null);
  private handleResetPasswordError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 400:
        this.errorMessage.set('The password reset link is invalid.');
        break;
      case 410:
        this.errorMessage.set('This password reset link has expired.');
        break;
      case 429:
        this.errorMessage.set('Too many attempts. Please try again later.');
        break;
      default:
        this.errorMessage.set('Unable to reset your password right now.');
    }
  }
  protected readonly resetPasswordForm = form(
    this.resetPasswordModel,
    (schemaPath) => {
      required(schemaPath.password, { message: 'Password is required' });
      minLength(schemaPath.password, 8, { message: 'Password must be at least 8 characters' });
      maxLength(schemaPath.password, 64, { message: 'Password has a 64 character limit' });
      required(schemaPath.confirmPassword, { message: 'Confirm password is required' });
      validate(schemaPath.confirmPassword, ({ value, valueOf, stateOf }) => {
        if (!stateOf(schemaPath.password).touched()) {
          return null;
        }
        if (value() !== valueOf(schemaPath.password)) {
          return {
            kind: 'passwordMismatch',
            message: "Passwords don't match",
          };
        }
        return null;
      });
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);

          try {
            await firstValueFrom(this.authService.resetPassword(field().value()));
            await this.router.navigate(['/auth/login'], { queryParams: { passwordReset: true } });
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

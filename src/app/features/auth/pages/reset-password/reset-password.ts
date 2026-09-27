import { Component, inject, signal } from '@angular/core';
import {
  Validators,
  ReactiveFormsModule,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  NonNullableFormBuilder,
} from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { ResetPasswordRequest } from '../../models/requests/reset-password-request';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-reset-password',
  styleUrl: './reset-password.css',
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]],
      confirmNewPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator(),
    },
  );
  protected readonly isLoading = signal(false);
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

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const newPassword = control.get('newPassword')?.value;
      const confirmNewPassword = control.get('confirmNewPassword')?.value;

      if (newPassword === confirmNewPassword) {
        return null;
      }
      return { passwordMismatch: true };
    };
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const password = this.form.getRawValue();
    const request: ResetPasswordRequest = {
      password: password.newPassword,
    };

    this.isLoading.set(true);

    this.authService
      .resetPassword(request)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          console.log(response);
        },
        error: (error: HttpErrorResponse) => {
          this.handleResetPasswordError(error);
        },
      });
  }
}

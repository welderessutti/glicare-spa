import { Component, inject, signal } from '@angular/core';
import { Validators, ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { ForgotPasswordRequest } from '../../models/requests/forgot-password-request';
import { AuthService } from '../../services/auth-service';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-forgot-password',
  styleUrl: './forgot-password.css',
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.getRawValue();
    const request: ForgotPasswordRequest = {
      email: email.email,
    };

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService
      .forgotPassword(request)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.successMessage.set(
            'If an account exists for this email, recovery instructions have been sent.',
          );
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 429) {
            this.errorMessage.set('Too many requests. Please try again later.');
            return;
          }
          this.errorMessage.set('Unable to process your request right now.');
        },
      });
  }
}

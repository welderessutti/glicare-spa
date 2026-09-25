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

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.getRawValue();
    const request: ForgotPasswordRequest = {
      email: email.email,
    };

    this.isLoading.set(true);

    this.authService
      .forgotPassword(request)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          console.log(response);
        },
        error: (error: HttpErrorResponse) => {
          console.log(error);
        },
      });
  }
}

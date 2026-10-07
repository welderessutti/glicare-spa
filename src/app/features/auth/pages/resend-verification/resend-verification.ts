import { Component, computed, inject, signal } from '@angular/core';
import { email, form, FormRoot, required, FormField } from '@angular/forms/signals';
import { AuthService } from '../../services/auth-service';
import { ResendVerificationRequest } from '../../models/requests/resend-verification-request';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  imports: [FormRoot, FormField, RouterLink],
  selector: 'app-resend-verification',
  styleUrl: './resend-verification.css',
  templateUrl: './resend-verification.html',
})
export class ResendVerification {
  private readonly authService = inject(AuthService);
  private readonly resendVerificationModel = signal<ResendVerificationRequest>({
    email: '',
  });
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly emailInvalid = computed(
    () =>
      this.resendVerificationForm.email().touched() &&
      this.resendVerificationForm.email().invalid(),
  );

  protected readonly resendVerificationForm = form(
    this.resendVerificationModel,
    (schemaPath) => {
      required(schemaPath.email, { message: 'Enter your email address.' });
      email(schemaPath.email, { message: 'Enter a valid email address.' });
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);
          this.successMessage.set(null);
          try {
            await firstValueFrom(this.authService.resendVerification(field().value()));
            this.successMessage.set(
              'If an account exists for this email and still requires verification, a new verification link has been sent.',
            );
          } catch (error) {
            const httpError = error as HttpErrorResponse;
            if (httpError.status === 429) {
              this.errorMessage.set('Too many requests. Please try again later.');
              return;
            }
            this.errorMessage.set('Unable to process your request right now.');
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

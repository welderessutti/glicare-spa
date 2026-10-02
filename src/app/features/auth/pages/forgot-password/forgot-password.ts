import { Component, computed, inject, signal } from '@angular/core';
import { ForgotPasswordRequest } from '../../models/requests/forgot-password-request';
import { AuthService } from '../../services/auth-service';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { email, form, required, FormField, FormRoot } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

@Component({
  imports: [FormField, FormRoot, RouterLink],
  selector: 'app-forgot-password',
  styleUrl: './forgot-password.css',
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly authService = inject(AuthService);
  private readonly forgotPasswordModel = signal<ForgotPasswordRequest>({ email: '' });
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly emailInvalid = computed(
    () => this.forgotPasswordForm.email().touched() && this.forgotPasswordForm.email().invalid(),
  );

  protected readonly forgotPasswordForm = form(
    this.forgotPasswordModel,
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
            await firstValueFrom(this.authService.forgotPassword(field().value()));
            this.successMessage.set(
              'If an account exists for this email, recovery instructions have been sent.',
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

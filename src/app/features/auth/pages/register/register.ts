import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { RegisterRequest } from '../../models/requests/register-request';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';

@Component({
  imports: [FormRoot, FormField, RouterLink],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly registerModel = signal<RegisterRequest>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);
  protected readonly fullNameInvalid = computed(
    () => this.registerForm.fullName().touched() && this.registerForm.fullName().invalid(),
  );
  protected readonly emailInvalid = computed(
    () => this.registerForm.email().touched() && this.registerForm.email().invalid(),
  );
  protected readonly passwordInvalid = computed(
    () => this.registerForm.password().touched() && this.registerForm.password().invalid(),
  );
  protected readonly confirmPasswordInvalid = computed(
    () =>
      this.registerForm.confirmPassword().touched() &&
      this.registerForm.confirmPassword().invalid(),
  );

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  private handleRegisterError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 409:
        this.errorMessage.set('An account with this email already exists.');
        break;
      case 429:
        this.errorMessage.set('Too many attempts. Please try again later.');
        break;
      default:
        this.errorMessage.set('Unable to create your account right now.');
    }
  }

  protected readonly registerForm = form(
    this.registerModel,
    (schemaPath) => {
      required(schemaPath.fullName, { message: 'Enter your full name.' });
      required(schemaPath.email, { message: 'Enter your email address.' });
      email(schemaPath.email, { message: 'Enter a valid email address.' });
      required(schemaPath.password, { message: 'Enter your password.' });
      minLength(schemaPath.password, 8, { message: 'Use at least 8 characters.' });
      maxLength(schemaPath.password, 64, { message: 'Use no more than 64 characters.' });
      required(schemaPath.confirmPassword, { message: 'Confirm your password.' });
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

          try {
            await firstValueFrom(this.authService.register(field().value()));
            await this.router.navigate(['/auth/check-email']);
          } catch (error) {
            const httpError = error as HttpErrorResponse;
            this.handleRegisterError(httpError);
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

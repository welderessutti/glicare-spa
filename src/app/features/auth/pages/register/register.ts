import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { RegisterRequest } from '../../models/requests/register-request';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
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
  imports: [FormRoot, FormField],
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
      required(schemaPath.fullName, { message: 'Full name is required' });
      required(schemaPath.email, { message: 'Email is required' });
      email(schemaPath.email, { message: 'Enter a valid email' });
      required(schemaPath.password, { message: 'Password is required' });
      minLength(schemaPath.password, 8, { message: 'Password must contain at least 8 characters' });
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

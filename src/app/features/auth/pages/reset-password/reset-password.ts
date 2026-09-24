import { Component, inject, signal } from '@angular/core';
import {
  Validators,
  ReactiveFormsModule,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  NonNullableFormBuilder,
} from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-reset-password',
  styleUrl: './reset-password.css',
  templateUrl: './reset-password.html',
})
export class ResetPassword {
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

  sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);

    const credentials = this.form.getRawValue();
    console.log(credentials);

    await this.sleep(5000);

    this.isLoading.set(false);
  }
}

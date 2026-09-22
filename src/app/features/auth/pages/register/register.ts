import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]],
      confirmPassword: [
        '',
        [Validators.required, Validators.minLength(6), Validators.maxLength(12)],
      ],
    },
    {
      validators: this.passwordMatchValidator(),
    },
  );

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password')?.value;
      const confirmPassword = control.get('confirmPassword')?.value;

      if (password === confirmPassword) {
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
    const register = this.form.getRawValue();

    console.log(register);
  }
}

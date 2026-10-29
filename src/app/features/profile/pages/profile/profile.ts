import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../../../core/services/session/session-service';
import { ChangePasswordRequest } from '../../../auth/models/requests/change-password-request';
import { AuthService } from '../../../auth/services/auth-service';
import { Profile as ProfileModel } from '../../models/profile';
import { UpdateProfileRequest } from '../../models/requests/update-profile-request';
import { ProfileService } from '../../services/profile-service';

@Component({
  imports: [DatePipe, FormField, FormRoot],
  selector: 'app-profile',
  styleUrl: './profile.css',
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly sessionService = inject(SessionService);
  private readonly authService = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly editProfileButton =
    viewChild<ElementRef<HTMLButtonElement>>('editProfileButton');
  private readonly changePasswordButton =
    viewChild<ElementRef<HTMLButtonElement>>('changePasswordButton');
  private readonly profileModel = signal<UpdateProfileRequest>({ fullName: '' });
  private readonly passwordModel = signal<ChangePasswordRequest & { confirmNewPassword: string }>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  protected readonly profile = signal<ProfileModel | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly editingProfile = signal(false);
  protected readonly profileError = signal('');
  protected readonly changingPassword = signal(false);
  protected readonly passwordError = signal('');
  protected readonly feedback = signal('');

  protected readonly fullNameInvalid = computed(
    () => this.profileForm.fullName().touched() && this.profileForm.fullName().invalid(),
  );
  protected readonly currentPasswordInvalid = computed(
    () =>
      this.passwordForm.currentPassword().touched() &&
      this.passwordForm.currentPassword().invalid(),
  );
  protected readonly newPasswordInvalid = computed(
    () => this.passwordForm.newPassword().touched() && this.passwordForm.newPassword().invalid(),
  );
  protected readonly confirmNewPasswordInvalid = computed(
    () =>
      this.passwordForm.confirmNewPassword().touched() &&
      this.passwordForm.confirmNewPassword().invalid(),
  );

  protected readonly profileForm = form(
    this.profileModel,
    (path) => {
      required(path.fullName, { message: 'Enter your full name.' });
    },
    {
      submission: {
        action: async (field) => {
          this.profileError.set('');
          this.feedback.set('');
          const request: UpdateProfileRequest = { fullName: field().value().fullName };
          try {
            const updated = await firstValueFrom(this.profileService.update(request));
            this.profile.set(updated);
            const user = this.sessionService.user();
            if (user) {
              this.sessionService.updateUser({ ...user, fullName: updated.fullName });
            }
            this.cancelProfileEdit();
            this.feedback.set('Profile updated.');
          } catch {
            this.profileError.set('Unable to update your profile. Please try again.');
          }
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  protected readonly passwordForm = form(
    this.passwordModel,
    (path) => {
      required(path.currentPassword, { message: 'Enter your current password.' });
      required(path.newPassword, { message: 'Enter your new password.' });
      minLength(path.newPassword, 8, { message: 'Use at least 8 characters.' });
      maxLength(path.newPassword, 64, { message: 'Use no more than 64 characters.' });
      required(path.confirmNewPassword, { message: 'Confirm your new password.' });
      validate(path.confirmNewPassword, ({ value, valueOf, stateOf }) => {
        if (!value() || !stateOf(path.newPassword).touched()) return null;
        if (value() !== valueOf(path.newPassword)) {
          return { kind: 'passwordMismatch', message: "Passwords don't match." };
        }
        return null;
      });
    },
    {
      submission: {
        action: async (field) => {
          this.passwordError.set('');
          this.feedback.set('');
          const { currentPassword, newPassword } = field().value();
          const request: ChangePasswordRequest = { currentPassword, newPassword };
          try {
            await firstValueFrom(this.authService.changePassword(request));
            this.cancelPasswordChange();
            this.feedback.set('Password changed.');
          } catch {
            this.passwordError.set('Unable to change your password. Please try again.');
          }
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  ngOnInit(): void {
    this.loadProfile();
  }

  protected loadProfile(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.profileService.get().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load your profile.');
        this.loading.set(false);
      },
    });
  }

  protected openProfileEdit(): void {
    const profile = this.profile();
    if (!profile) return;
    this.profileForm().reset({ fullName: profile.fullName });
    this.profileError.set('');
    this.feedback.set('');
    this.editingProfile.set(true);
    afterNextRender(
      { write: () => this.profileForm.fullName().focusBoundControl() },
      { injector: this.injector },
    );
  }

  protected cancelProfileEdit(): void {
    this.profileForm().reset({ fullName: this.profile()?.fullName ?? '' });
    this.profileError.set('');
    this.editingProfile.set(false);
    afterNextRender(
      { write: () => this.editProfileButton()?.nativeElement.focus() },
      { injector: this.injector },
    );
  }

  protected openPasswordChange(): void {
    this.passwordForm().reset({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    this.passwordError.set('');
    this.feedback.set('');
    this.changingPassword.set(true);
    afterNextRender(
      { write: () => this.passwordForm.currentPassword().focusBoundControl() },
      { injector: this.injector },
    );
  }

  protected cancelPasswordChange(): void {
    this.passwordForm().reset({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    this.passwordError.set('');
    this.changingPassword.set(false);
    afterNextRender(
      { write: () => this.changePasswordButton()?.nativeElement.focus() },
      { injector: this.injector },
    );
  }
}

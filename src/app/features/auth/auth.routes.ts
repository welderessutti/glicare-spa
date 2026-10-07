import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest/guest-guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        title: 'Sign In | Glicare',
        loadComponent: () => import('./pages/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        title: 'Create account | Glicare',
        loadComponent: () => import('./pages/register/register').then((m) => m.Register),
      },
      {
        path: 'forgot-password',
        canActivate: [guestGuard],
        title: 'Forgot password | Glicare',
        loadComponent: () =>
          import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'reset-password',
        canActivate: [guestGuard],
        title: 'Reset password | Glicare',
        loadComponent: () =>
          import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
      },
      {
        path: 'verify-email',
        canActivate: [guestGuard],
        title: 'Verify email | Glicare',
        loadComponent: () => import('./pages/verify-email/verify-email').then((m) => m.VerifyEmail),
      },
      {
        path: 'resend-verification',
        canActivate: [guestGuard],
        title: 'Resend verification | Glicare',
        loadComponent: () =>
          import('./pages/resend-verification/resend-verification').then(
            (m) => m.ResendVerification,
          ),
      },
    ],
  },
];

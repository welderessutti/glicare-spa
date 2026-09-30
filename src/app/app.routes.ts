import { Routes } from '@angular/router';
import { sessionGuard } from './core/guards/session/session-guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [sessionGuard],
    loadComponent: () => import('./core/layouts/app-layout/app-layout').then((m) => m.AppLayout),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '**',
    loadComponent: () => import('./core/pages/not-found/not-found').then((m) => m.NotFound),
  },
];

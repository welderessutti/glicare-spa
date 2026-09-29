import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../../services/session/session-service';

export const sessionGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  return sessionService.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
};

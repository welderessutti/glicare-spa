import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpErrorInterceptor } from './core/interceptors/http-error-interceptor';
import { SessionService } from './core/services/session/session-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    provideAppInitializer(() => {
      return inject(SessionService).restoreSession();
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
};

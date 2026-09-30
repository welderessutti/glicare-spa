import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 0:
          console.error('API unreachable or network error.');
          break;

        case 403:
          console.error('Access denied.');
          break;

        case 429:
          console.error('Too many requests.');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          console.error('Server unavailable.');
          break;
      }

      return throwError(() => error);
    }),
  );
};

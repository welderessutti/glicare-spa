import { HttpInterceptorFn } from '@angular/common/http';
import { API_URL } from '../../../shared/api-url';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(API_URL)) {
    const request = req.clone({
      withCredentials: true,
    });
    return next(request);
  }
  return next(req);
};

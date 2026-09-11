import { HttpInterceptorFn } from '@angular/common/http';

/** Sends the session cookie on every API call, including cross-origin ones. */
export const withCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
